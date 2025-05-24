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
import { deleteFile, uploadFile } from '../../core/lib/cloudinary.js';
import type {
    EditUserServiceReturnType,
    GetUserMessagesServiceReturnType,
} from './user.types.js';
import type {
    EditUserRequestDto,
    ResetPasswordRequestDto,
    Role,
} from '@blue0206/members-only-shared-types';
import type { User } from '../../core/db/prisma-client/client.js';
import type { AccessTokenPayload } from '../auth/auth.types.js';

class UserService {
    async getUserMessages(
        userId: number
    ): Promise<GetUserMessagesServiceReturnType> {
        logger.info({ userId }, 'Getting user messages from database.');

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

        if (!userWithMessages) {
            throw new InternalServerError(
                'User not found in database.',
                ErrorCodes.DATABASE_ERROR
            );
        }

        logger.info(
            { username: userWithMessages.username, role: userWithMessages.role },
            'User messages retrieved from database successfully.'
        );
        return userWithMessages;
    }

    async editUser(
        updateData: EditUserRequestDto,
        userPayload: AccessTokenPayload,
        avatarImage: Buffer | undefined
    ): Promise<EditUserServiceReturnType> {
        logger.info(
            { userId: userPayload.id },
            'Updating user details in database.'
        );

        // If avatarImage buffer has been provided, upload it to cloudinary.
        let avatarPublicId: string | null;
        if (avatarImage) {
            avatarPublicId = await uploadFile(avatarImage, userPayload.username);
        }

        const user: EditUserServiceReturnType = await prismaErrorHandler(
            async () => {
                return await prisma.user.update({
                    where: {
                        id: userPayload.id,
                    },
                    data: {
                        username: updateData.newUsername,
                        firstName: updateData.newFirstname,
                        middleName: updateData.newMiddlename,
                        lastName: updateData.newLastname,
                        avatar: avatarPublicId,
                    },
                    omit: {
                        password: true,
                    },
                });
            }
        );

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
        logger.info({ username }, 'Deleting user from database.');

        await prismaErrorHandler(async () => {
            return await prisma.user.delete({
                where: {
                    username,
                },
            });
        });

        logger.info({ username }, 'User deleted from database successfully.');
    }

    async deleteAccount(userId: number): Promise<void> {
        logger.info({ userId }, 'Deleting user from database.');

        await prismaErrorHandler(async () => {
            return await prisma.user.delete({
                where: {
                    id: userId,
                },
            });
        });

        logger.info({ userId }, 'User deleted from database successfully.');
    }

    async resetPassword(
        passData: ResetPasswordRequestDto,
        userId: number
    ): Promise<void> {
        logger.info({ userId }, 'Resetting user password in database.');

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

        if (!user) {
            throw new InternalServerError(
                'User not found in database.',
                ErrorCodes.DATABASE_ERROR
            );
        }

        const passwordMatch = await bcrypt.compare(
            passData.oldPassword,
            user.password
        );

        if (!passwordMatch) {
            throw new UnauthorizedError(
                'Incorrect password.',
                ErrorCodes.INCORRECT_PASSWORD
            );
        }

        const newHashedPassword = await bcrypt.hash(
            passData.newPassword,
            config.SALT_ROUNDS
        );

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

        logger.info({ userId }, 'User password reset in database successfully.');
    }

    async setMemberRole(userId: number, secretKey: string): Promise<void> {
        logger.info({ userId }, 'Setting user role in database.');

        if (secretKey !== config.MEMBER_ROLE_SECRET_KEY) {
            throw new UnauthorizedError(
                'The secret key is incorrect.',
                ErrorCodes.INCORRECT_SECRET_KEY
            );
        }

        await prismaErrorHandler(async () => {
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
        });

        logger.info(
            { userId, role: 'MEMBER' },
            'User role set in database successfully.'
        );
    }

    async updateRole(username: string, role: Role): Promise<void> {
        logger.info({ username, newRole: role }, 'Updating user role in database.');

        await prismaErrorHandler(async () => {
            return await prisma.user.update({
                where: {
                    username,
                },
                data: {
                    role,
                },
            });
        });

        logger.info({ username, newRole: role }, 'User role updated successfully.');
    }

    async deleteUserAvatar(username: string): Promise<void> {
        // Log the start of process.
        logger.info(
            { username },
            'Deleting user avatar from database and cloudinary.'
        );

        const avatarPublicId: User['avatar'] = await prismaErrorHandler(async () => {
            return await prisma.$transaction(async (tx) => {
                const user = await tx.user.findUnique({
                    where: {
                        username,
                    },
                    select: {
                        avatar: true,
                    },
                });

                if (!user?.avatar) {
                    throw new InternalServerError(
                        'User avatar not found in database.',
                        ErrorCodes.DATABASE_ERROR
                    );
                }

                await tx.user.update({
                    where: {
                        username,
                    },
                    data: {
                        avatar: null,
                    },
                });

                return user.avatar;
            });
        });

        await deleteFile(avatarPublicId);

        logger.info(
            { username },
            'User avatar deleted from database and cloudinary successfully.'
        );
    }
}

export const userService = new UserService();
