import { ErrorCodes, Role } from '@blue0206/members-only-shared-types';
import { prisma } from '../../core/db/prisma.js';
import prismaErrorHandler from '../../core/utils/prismaErrorHandler.js';
import {
    ForbiddenError,
    InternalServerError,
} from '../../core/errors/customErrors.js';
import { logger } from '../../core/logger.js';
import type {
    CreateMessageServiceReturnType,
    EditMessageServiceReturnType,
    GetMessagesServiceReturnType,
} from './message.types.js';
import type { AccessTokenPayload } from '../auth/auth.types.js';
import type { Like, Message } from '../../core/db/prisma-client/client.js';

class MessageService {
    async getMessages(): Promise<GetMessagesServiceReturnType> {
        logger.info('Getting messages from database.');

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
            }
        );

        logger.info('Messages fetched successfully.');
        return messages;
    }

    async createMessage(
        message: string,
        userId: number
    ): Promise<CreateMessageServiceReturnType> {
        logger.info({ message, userId }, 'Creating message in database.');

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
            });

        // Throw error if user is not returned, which
        // hints that user in not actually in DB since relation is optional.
        if (!createdMessage.author) {
            throw new InternalServerError(
                'User not found in database.',
                ErrorCodes.DATABASE_ERROR
            );
        }

        logger.info({ message, userId }, 'Message created successfully.');
        return createdMessage;
    }

    async editMessage(
        newMessage: string,
        messageId: number,
        user: AccessTokenPayload
    ): Promise<EditMessageServiceReturnType> {
        logger.info({ newMessage, messageId, user }, 'Editing message in database.');

        // Conditionally perform a DB call to check if the user is not updating another
        // user's message while not being an admin.
        if (user.role === Role.MEMBER) {
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
                });

            if (!messageAuthorDetails) {
                throw new InternalServerError(
                    'Message not found in database.',
                    ErrorCodes.DATABASE_ERROR
                );
            }

            // Ensure the member is not editing another user's message.
            if (messageAuthorDetails.authorId !== user.id) {
                throw new ForbiddenError(
                    'You do not have permission to edit this message.',
                    ErrorCodes.FORBIDDEN
                );
            }
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
            });

        logger.info({ newMessage, messageId, user }, 'Message edited successfully.');
        return editedMessageDetails;
    }

    async deleteMessage(messageId: number, user: AccessTokenPayload): Promise<void> {
        logger.info({ messageId, user }, 'Deleting message from database.');

        // Conditionally perform a DB call to check if the user is not deleting another
        // user's message while not being an admin.
        if (user.role !== Role.ADMIN) {
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
                });

            if (!messageAuthorDetails) {
                throw new InternalServerError(
                    'Message not found in database.',
                    ErrorCodes.DATABASE_ERROR
                );
            }

            // Ensure the user is not deleting another user's message.
            if (messageAuthorDetails.authorId !== user.id) {
                throw new ForbiddenError(
                    'You do not have permission to delete this message.',
                    ErrorCodes.FORBIDDEN
                );
            }
        }

        // Delete message from DB.
        await prismaErrorHandler(async () => {
            return await prisma.message.delete({
                where: {
                    id: messageId,
                },
            });
        });

        logger.info({ messageId, user }, 'Message deleted successfully.');
    }

    async likeMessage(messageId: number, userId: number): Promise<void> {
        logger.info({ messageId, userId }, 'Liking message in database.');

        const like: Like = await prismaErrorHandler(async () => {
            return await prisma.like.create({
                data: {
                    messageId,
                    userId,
                },
            });
        });

        logger.info(
            { id: like.id, messageId, userId },
            'Message liked successfully.'
        );
    }

    async unlikeMessage(messageId: number, userId: number): Promise<void> {
        logger.info({ messageId, userId }, 'Unliking message in database.');

        await prismaErrorHandler(async () => {
            await prisma.like.delete({
                where: {
                    userId_messageId: {
                        userId,
                        messageId,
                    },
                },
            });
        });

        logger.info({ messageId, userId }, 'Message unliked successfully.');
    }
}

export const messageService = new MessageService();
