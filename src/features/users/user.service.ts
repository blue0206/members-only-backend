import { prisma } from '../../core/db/prisma.js';
import { logger } from '../../core/logger.js';
import { InternalServerError } from '../../core/errors/customErrors.js';
import prismaErrorHandler from '../../core/utils/prismaErrorHandler.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import type { GetUserMessagesServiceReturnType } from './user.types.js';

class UserService {
    async getUserMessages(
        userId: number
    ): Promise<GetUserMessagesServiceReturnType> {
        // Log the start of process.
        logger.info({ userId }, 'Getting user messages from database.');

        // Get user messages from DB.
        const userWithMessages: GetUserMessagesServiceReturnType | null =
            await prismaErrorHandler(async () => {
                return await prisma.user.findUnique({
                    where: {
                        id: userId,
                    },
                    include: {
                        messages: true,
                    },
                    omit: {
                        password: true,
                    },
                });
            });
        // Throw error if user not found.
        if (!userWithMessages) {
            throw new InternalServerError(
                'User not found in database.',
                ErrorCodes.DATABASE_ERROR
            );
        }

        // Log the success of process and return data.
        logger.info(
            { username: userWithMessages.username, role: userWithMessages.role },
            'User messages retrieved from database successfully.'
        );
        return userWithMessages;
    }
}

export const userService = new UserService();
