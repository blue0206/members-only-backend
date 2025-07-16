import { ErrorCodes } from '@blue0206/members-only-shared-types/api/error-codes';
import { Role } from '@blue0206/members-only-shared-types/enums/roles.enum';
import { prisma } from '@members-only/database';
import { prismaErrorHandler } from '@members-only/core-utils/utils/prismaErrorHandler';
import {
    ForbiddenError,
    InternalServerError,
} from '@members-only/core-utils/errors';
import { SseEventNames } from '@blue0206/members-only-shared-types/api/event-names';
import { EventReason } from '@blue0206/members-only-shared-types/enums/eventReason.enum';
import { eventDispatch } from '@members-only/core-utils/utils/eventDispatch';
import type {
    CreateMessageServiceReturnType,
    EditMessageServiceReturnType,
    GetMessagesServiceReturnType,
} from './message.types.js';
import type { AccessTokenPayload } from '@members-only/core-utils/authTypes';
import type { Logger } from '@members-only/core-utils/logger';
import type { Like, Message } from '@members-only/database';
import type { EventRequestDto } from '@blue0206/members-only-shared-types/dtos/event.dto';

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

        log.info(
            {
                messageId: createdMessage.id,
                message,
                author: createdMessage.author.username,
                authorId: createdMessage.author.id,
            },
            'Message created successfully.'
        );

        // Dispatch event to SSE service to broadcast event to clients.
        const body: EventRequestDto = {
            events: [
                {
                    eventName: SseEventNames.MESSAGE_EVENT,
                    payload: {
                        originId: createdMessage.author.id,
                        reason: EventReason.MESSAGE_CREATED,
                    },
                    transmissionType: 'broadcast',
                },
            ],
        };
        await eventDispatch(body)
            .then(() => {
                log.info('Event dispatched successfully.');
            })
            .catch((error: unknown) => {
                log.error({ error }, 'Failed to dispatch event.');
            });

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

        // Dispatch event to SSE service to broadcast event to clients.
        const body: EventRequestDto = {
            events: [
                {
                    eventName: SseEventNames.MESSAGE_EVENT,
                    payload: {
                        originId: user.id,
                        reason: EventReason.MESSAGE_UPDATED,
                    },
                    transmissionType: 'broadcast',
                },
            ],
        };
        await eventDispatch(body)
            .then(() => {
                log.info('Event dispatched successfully.');
            })
            .catch((error: unknown) => {
                log.error({ error }, 'Failed to dispatch event.');
            });

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

        // Dispatch event to SSE service to broadcast event to clients.
        const body: EventRequestDto = {
            events: [
                {
                    eventName: SseEventNames.MESSAGE_EVENT,
                    payload: {
                        originId: user.id,
                        reason: EventReason.MESSAGE_DELETED,
                    },
                    transmissionType: 'broadcast',
                },
            ],
        };
        await eventDispatch(body)
            .then(() => {
                log.info('Event dispatched successfully.');
            })
            .catch((error: unknown) => {
                log.error({ error }, 'Failed to dispatch event.');
            });
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
