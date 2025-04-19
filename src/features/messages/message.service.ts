import { ErrorCodes } from '@blue0206/members-only-shared-types';
import { prisma } from '../../core/db/prisma.js';
import { InternalServerError } from '../../core/errors/customErrors.js';
import { logger } from '../../core/logger.js';
import type {
    CreateMessageServiceReturnType,
    GetMessagesServiceReturnType,
} from './message.types.js';

class MessageService {
    async getMessages(): Promise<GetMessagesServiceReturnType> {
        // Log the start of process.
        logger.info('Getting messages from database.');

        // Get messages from DB.
        const messages: GetMessagesServiceReturnType = await prisma.message.findMany(
            {
                include: {
                    author: true,
                },
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
            await prisma.message.create({
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
}

export const messageService = new MessageService();
