import { prisma } from '../../core/db/prisma.js';
import { logger } from '../../core/logger.js';
import prismaErrorHandler from '../../core/utils/prismaErrorHandler.js';
import { InternalServerError } from '../../core/errors/customErrors.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import type {
    EditUserServiceReturnType,
    GetUserMessagesServiceReturnType,
} from './user.types.js';
import type { EditUserRequestDto } from '@blue0206/members-only-shared-types';

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

    async editUser(
        updateData: EditUserRequestDto,
        userId: number
    ): Promise<EditUserServiceReturnType> {
        // Log the start of process.
        logger.info({ userId }, 'Updating user details in database.');

        // Update user details in DB.
        const user: EditUserServiceReturnType = await prismaErrorHandler(
            async () => {
                return await prisma.user.update({
                    where: {
                        id: userId,
                    },
                    data: {
                        username: updateData.newUsername,
                        firstName: updateData.newFirstname,
                        middleName: updateData.newMiddlename,
                        lastName: updateData.newLastname,
                        avatar: updateData.newAvatar,
                    },
                    omit: {
                        password: true,
                    },
                });
            }
        );

        // Log the success of process and return data.
        logger.info(
            {
                id: user.id,
                username: user.username,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                role: user.role,
            },
            'User details updated in database successfully.'
        );
        return user;
    }

    async deleteUserByUsername(username: string): Promise<void> {
        // Log the start of process.
        logger.info({ username }, 'Deleting user from database.');

        // Delete user from DB.
        await prismaErrorHandler(async () => {
            return await prisma.user.delete({
                where: {
                    username,
                },
            });
        });

        // Log the success of process.
        logger.info({ username }, 'User deleted from database successfully.');
    }

    async deleteAccount(userId: number): Promise<void> {
        // Log the start of process.
        logger.info({ userId }, 'Deleting user from database.');

        // Delete user from DB.
        await prismaErrorHandler(async () => {
            return await prisma.user.delete({
                where: {
                    id: userId,
                },
            });
        });

        // Log the success of process.
        logger.info({ userId }, 'User deleted from database successfully.');
    }
}

export const userService = new UserService();
