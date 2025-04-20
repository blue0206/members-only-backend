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
import type { Message } from '../../core/db/prisma-client/client.js';

class MessageService {
    async getMessages(): Promise<GetMessagesServiceReturnType> {
        // Log the start of process.
        logger.info('Getting messages from database.');

        // Get messages from DB.
        const messages: GetMessagesServiceReturnType = await prismaErrorHandler(
            async () => {
                return await prisma.message.findMany({
                    include: {
                        author: true,
                    },
                });
            }
        );

        // Log the success of process and return data.
        logger.info('Messages fetched successfully.');
        return messages;
    }

    async createMessage(
        message: string,
        userId: number
    ): Promise<CreateMessageServiceReturnType> {
        // Log the start of process.
        logger.info({ message, userId }, 'Creating message in database.');

        // Create message in DB.
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
                        author: true,
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

        // Log the success of process and return data.
        logger.info({ message, userId }, 'Message created successfully.');
        return createdMessage;
    }

    async editMessage(
        newMessage: string,
        messageId: number,
        user: AccessTokenPayload
    ): Promise<EditMessageServiceReturnType> {
        // Log the start of process.
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

            // Throw error if message is not found.
            if (!messageAuthorDetails) {
                throw new InternalServerError(
                    'Message not found in database.',
                    ErrorCodes.DATABASE_ERROR
                );
            }

            // Check if the message author id is the same as the user id of the
            // member who is trying to update the message.
            if (messageAuthorDetails.authorId !== user.id) {
                throw new ForbiddenError(
                    'You do not have permission to edit this message.',
                    ErrorCodes.FORBIDDEN
                );
            }
        }

        // Edit message in DB.
        const editedMessageDetails: EditMessageServiceReturnType =
            await prismaErrorHandler(async () => {
                return await prisma.message.update({
                    where: {
                        id: messageId,
                    },
                    data: {
                        content: newMessage,
                    },
                    include: {
                        author: true,
                    },
                });
            });

        // Log the success of process and return data.
        logger.info({ newMessage, messageId, user }, 'Message edited successfully.');
        return editedMessageDetails;
    }

    async deleteMessage(messageId: number, user: AccessTokenPayload): Promise<void> {
        // Log the start of process.
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

            // Throw error if message is not found.
            if (!messageAuthorDetails) {
                throw new InternalServerError(
                    'Message not found in database.',
                    ErrorCodes.DATABASE_ERROR
                );
            }

            // Check if the message author id is the same as the user id of the
            // user who is trying to delete the message.
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

        // Log the success of process.
        logger.info({ messageId, user }, 'Message deleted successfully.');
    }
}

export const messageService = new MessageService();
