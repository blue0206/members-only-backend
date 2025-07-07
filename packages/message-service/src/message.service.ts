import { ErrorCodes } from '@blue0206/members-only-shared-types/api/error-codes';
import { Role } from '@blue0206/members-only-shared-types/enums/roles.enum';
import { prisma } from '@members-only/database';
import { prismaErrorHandler } from '@members-only/core-utils/utils/prismaErrorHandler';
import {
    ForbiddenError,
    InternalServerError,
} from '@members-only/core-utils/errors';
import type {
    CreateMessageServiceReturnType,
    EditMessageServiceReturnType,
    GetMessagesServiceReturnType,
} from './message.types.js';
import type { AccessTokenPayload } from '@members-only/core-utils/authTypes';
import type { Logger } from '@members-only/core-utils/logger';
import type { Like, Message } from '@members-only/database';

// TODO: Handle SSE events for real-time updates.
class MessageService {
    async getMessages(log: Logger): Promise<GetMessagesServiceReturnType> {
        log.info('Getting messages from database.');

        const messages: GetMessagesServiceReturnType = await prismaErrorHandler(
            async () => {
                return await prisma.message.findMany({
                    include: {
                        author: {
                            omit: {
                                password: true,
                            },
                        },
                        likes: true,
                        bookmarks: true,
                    },
                });
            },
            log
        );

        log.info('Messages fetched successfully.');
        return messages;
    }

    async createMessage(
        message: string,
        userId: number,
        log: Logger
    ): Promise<CreateMessageServiceReturnType> {
        log.info({ message }, 'Creating message in database.');

        const createdMessage: CreateMessageServiceReturnType =
            await prismaErrorHandler(async () => {
                return await prisma.message.create({
                    data: {
                        content: message,
                        author: {
                            connect: {
                                id: userId,
                            },
                        },
                    },
                    include: {
                        author: {
                            omit: {
                                password: true,
                            },
                        },
                        likes: true,
                        bookmarks: true,
                    },
                });
            }, log);

        // Throw error if user is not returned, which
        // hints that user in not actually in DB since relation is optional.
        if (!createdMessage.author) {
            throw new InternalServerError(
                'User not found in database.',
                ErrorCodes.DATABASE_ERROR
            );
        }

        log.info({ message }, 'Message created successfully.');

        // Broadcast event to all connected SSE clients to show real-time updates.
        // sseService.broadcastEvent<SseEventNamesType, MessageEventPayloadDto>({
        //     event: SseEventNames.MESSAGE_EVENT,
        //     data: {
        //         reason: EventReason.MESSAGE_CREATED,
        //         originId: createdMessage.author.id,
        //     },
        //     id: uuidv4(),
        // });

        return createdMessage;
    }

    async editMessage(
        newMessage: string,
        messageId: number,
        user: AccessTokenPayload,
        log: Logger
    ): Promise<EditMessageServiceReturnType> {
        log.info({ newMessage, messageId }, 'Editing message in database.');

        // Conditionally perform a DB call to check if the user is not updating another
        // user's message while not being an admin.
        if (user.role === Role.MEMBER) {
            await this.verifyMessageOwnership(messageId, user, log);
        }

        const editedMessageDetails: EditMessageServiceReturnType =
            await prismaErrorHandler(async () => {
                return await prisma.message.update({
                    where: {
                        id: messageId,
                    },
                    data: {
                        content: newMessage,
                        edited: true,
                    },
                    include: {
                        author: {
                            omit: {
                                password: true,
                            },
                        },
                        likes: true,
                        bookmarks: true,
                    },
                });
            }, log);

        log.info({ newMessage, messageId }, 'Message edited successfully.');

        // Broadcast event to all connected SSE clients to show real-time updates.
        // sseService.broadcastEvent<SseEventNamesType, MessageEventPayloadDto>({
        //     event: SseEventNames.MESSAGE_EVENT,
        //     data: {
        //         reason: EventReason.MESSAGE_UPDATED,
        //         originId: user.id,
        //     },
        //     id: uuidv4(),
        // });

        return editedMessageDetails;
    }

    async deleteMessage(
        messageId: number,
        user: AccessTokenPayload,
        log: Logger
    ): Promise<void> {
        log.info({ messageId }, 'Deleting message from database.');

        // Conditionally perform a DB call to check if the user is not deleting another
        // user's message while not being an admin.
        if (user.role !== Role.ADMIN) {
            await this.verifyMessageOwnership(messageId, user, log);
        }

        // Delete message from DB.
        await prismaErrorHandler(async () => {
            return await prisma.message.delete({
                where: {
                    id: messageId,
                },
            });
        }, log);

        log.info({ messageId }, 'Message deleted successfully.');

        // Broadcast event to all connected SSE clients to show real-time updates.
        // sseService.broadcastEvent<SseEventNamesType, MessageEventPayloadDto>({
        //     event: SseEventNames.MESSAGE_EVENT,
        //     data: {
        //         reason: EventReason.MESSAGE_DELETED,
        //         originId: user.id,
        //     },
        //     id: uuidv4(),
        // });
    }

    async likeMessage(
        messageId: number,
        userId: number,
        log: Logger
    ): Promise<void> {
        log.info({ messageId }, 'Liking message in database.');

        const like: Like = await prismaErrorHandler(async () => {
            return await prisma.like.create({
                data: {
                    messageId,
                    userId,
                },
            });
        }, log);

        log.info({ likeId: like.id, messageId }, 'Message liked successfully.');
    }

    async unlikeMessage(
        messageId: number,
        userId: number,
        log: Logger
    ): Promise<void> {
        log.info({ messageId }, 'Unliking message in database.');

        await prismaErrorHandler(async () => {
            await prisma.like.delete({
                where: {
                    userId_messageId: {
                        userId,
                        messageId,
                    },
                },
            });
        }, log);

        log.info({ messageId }, 'Message unliked successfully.');
    }

    private async verifyMessageOwnership(
        messageId: number,
        user: AccessTokenPayload,
        log: Logger
    ): Promise<void> {
        const messageAuthorDetails: Pick<Message, 'authorId'> | null =
            await prismaErrorHandler(async () => {
                return await prisma.message.findUnique({
                    where: {
                        id: messageId,
                    },
                    select: {
                        authorId: true,
                    },
                });
            }, log);

        if (!messageAuthorDetails) {
            throw new InternalServerError(
                'Message not found in database.',
                ErrorCodes.DATABASE_ERROR
            );
        }

        // Ensure the user is not performing action on another user's message.
        if (messageAuthorDetails.authorId !== user.id) {
            throw new ForbiddenError(
                'You do not have permission to perform this action.',
                ErrorCodes.FORBIDDEN
            );
        }
    }
}

export const messageService = new MessageService();
