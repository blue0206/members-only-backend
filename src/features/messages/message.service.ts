import { prisma } from '../../core/db/prisma.js';
import { logger } from '../../core/logger.js';
import type { GetMessagesServiceReturnType } from './message.types.js';

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
}

export const messageService = new MessageService();
