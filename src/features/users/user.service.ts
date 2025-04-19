import { prisma } from '../../core/db/prisma.js';
import { logger } from '../../core/logger.js';
import prismaErrorHandler from '../../core/utils/prismaErrorHandler.js';
import {
    InternalServerError,
    UnauthorizedError,
} from '../../core/errors/customErrors.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import bcrypt from 'bcrypt';
import { config } from '../../core/config/index.js';
import type {
    EditUserServiceReturnType,
    GetUserMessagesServiceReturnType,
    SetMemberRoleServiceReturnType,
} from './user.types.js';
import type {
    EditUserRequestDto,
    ResetPasswordRequestDto,
} from '@blue0206/members-only-shared-types';
import type { User } from '../../core/db/prisma-client/client.js';

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

    async resetPassword(
        passData: ResetPasswordRequestDto,
        userId: number
    ): Promise<void> {
        // Log the start of process.
        logger.info({ userId }, 'Resetting user password in database.');

        // Get existing hashed password from database.
        const user: Pick<User, 'password'> | null = await prismaErrorHandler(
            async () => {
                return await prisma.user.findUnique({
                    where: {
                        id: userId,
                    },
                    select: {
                        password: true,
                    },
                });
            }
        );

        // Throw error if user not found.
        if (!user) {
            throw new InternalServerError(
                'User not found in database.',
                ErrorCodes.DATABASE_ERROR
            );
        }

        // Compare the existing hashed password with the provided old password.
        const passwordMatch = await bcrypt.compare(
            passData.oldPassword,
            user.password
        );
        // Throw error if password does not match.
        if (!passwordMatch) {
            throw new UnauthorizedError(
                'Incorrect password.',
                ErrorCodes.INCORRECT_PASSWORD
            );
        }

        // Hash the new password with bcrypt.
        const newHashedPassword = await bcrypt.hash(
            passData.newPassword,
            config.SALT_ROUNDS
        );

        // Update database with new password.
        await prismaErrorHandler(async () => {
            return await prisma.user.update({
                where: {
                    id: userId,
                },
                data: {
                    password: newHashedPassword,
                },
            });
        });

        // Log the success of process.
        logger.info({ userId }, 'User password reset in database successfully.');
    }

    async setMemberRole(
        userId: number,
        secretKey: string
    ): Promise<SetMemberRoleServiceReturnType> {
        // Log the start of process.
        logger.info({ userId }, 'Setting user role in database.');

        // Check if secret key is correct:
        if (secretKey !== config.MEMBER_ROLE_SECRET_KEY) {
            throw new UnauthorizedError(
                'The secret key is incorrect.',
                ErrorCodes.INCORRECT_SECRET_KEY
            );
        }

        // Update member role in DB.
        const updatedUser: SetMemberRoleServiceReturnType = await prismaErrorHandler(
            async () => {
                return await prisma.user.update({
                    where: {
                        id: userId,
                    },
                    data: {
                        role: 'MEMBER',
                    },
                    select: {
                        role: true,
                    },
                });
            }
        );

        // Log the success of process.
        logger.info(
            { userId, role: updatedUser.role },
            'User role set in database successfully.'
        );
        return updatedUser;
    }
}

export const userService = new UserService();
