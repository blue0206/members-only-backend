import { prisma } from '../../core/db/prisma.js';
import { logger } from '../../core/logger.js';
import prismaErrorHandler from '../../core/utils/prismaErrorHandler.js';
import {
    InternalServerError,
    UnauthorizedError,
} from '../../core/errors/customErrors.js';
import {
    ErrorCodes,
    EventReason,
    SseEventNames,
    Role,
} from '@blue0206/members-only-shared-types';
import bcrypt from 'bcrypt';
import { config } from '../../core/config/index.js';
import { deleteFile, uploadFile } from '../../core/lib/cloudinary.js';
import { sseService } from '../sse/sse.service.js';
import { v4 as uuidv4 } from 'uuid';
import type {
    EditUserServiceReturnType,
    GetUserBookmarksServiceReturnType,
    GetUsersServiceReturnType,
    UploadAvatarServiceReturnType,
} from './user.types.js';
import type {
    EditUserRequestDto,
    MultiEventPayloadDto,
    ResetPasswordRequestDto,
    SseEventNamesType,
} from '@blue0206/members-only-shared-types';
import type { Bookmark, User } from '../../core/db/prisma-client/client.js';
import type { AccessTokenPayload } from '../auth/auth.types.js';

class UserService {
    async getUsers(): Promise<GetUsersServiceReturnType> {
        logger.info('Getting all users from database.');

        const users: GetUsersServiceReturnType = await prismaErrorHandler(
            async () => {
                return await prisma.user.findMany({
                    omit: {
                        password: true,
                    },
                });
            }
        );

        logger.info('Users retrieved from database successfully.');
        return users;
    }

    async editUser(
        updateData: EditUserRequestDto,
        userPayload: AccessTokenPayload
    ): Promise<EditUserServiceReturnType> {
        logger.info(
            { userId: userPayload.id },
            'Updating user details in database.'
        );

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

        // We need only send this event to the roles who can actually view the
        // profile details of users, i.e. ADMIN and MEMBER roles.
        sseService.multicastEventToRoles<SseEventNamesType, MultiEventPayloadDto>(
            [Role.ADMIN, Role.MEMBER],
            {
                event: SseEventNames.MULTI_EVENT,
                data: {
                    reason: EventReason.USER_UPDATED,
                    originId: user.id,
                },
                id: uuidv4(),
            }
        );

        return user;
    }

    // Endpoint for ADMINs to delete user.
    async deleteUserByUsername(username: string, adminId: number): Promise<void> {
        logger.info({ username }, 'Deleting user from database.');

        const deletedUser = await prismaErrorHandler(async () => {
            return await prisma.user.delete({
                where: {
                    username,
                },
            });
        });

        logger.info({ username }, 'User deleted from database successfully.');

        // We only send this to the roles who can actually view the other users,
        // i.e. ADMIN and MEMBER roles.
        const multiEventPayloadDto: MultiEventPayloadDto = {
            reason: EventReason.USER_DELETED_BY_ADMIN,
            originId: adminId,
            targetId: deletedUser.id,
        };
        sseService.multicastEventToRoles<SseEventNamesType, MultiEventPayloadDto>(
            [Role.ADMIN, Role.MEMBER],
            {
                event: SseEventNames.MULTI_EVENT,
                data: multiEventPayloadDto,
                id: uuidv4(),
            }
        );
        // In case the affected user is of USER role, we send the
        // event to the user as well in order clear their client state.
        if (deletedUser.role === 'USER') {
            sseService.unicastEvent<SseEventNamesType, MultiEventPayloadDto>(
                deletedUser.id,
                {
                    event: SseEventNames.MULTI_EVENT,
                    data: multiEventPayloadDto,
                    id: uuidv4(),
                }
            );
        }
    }

    // Endpoint for users to delete their own account.
    async deleteAccount(userId: number): Promise<void> {
        logger.info({ userId }, 'Deleting user from database.');

        const deletedUser = await prismaErrorHandler(async () => {
            return await prisma.user.delete({
                where: {
                    id: userId,
                },
            });
        });

        logger.info({ userId }, 'User deleted from database successfully.');

        // We only send this to the roles who can actually view the other users,
        // i.e. ADMIN and MEMBER roles.
        sseService.multicastEventToRoles<SseEventNamesType, MultiEventPayloadDto>(
            [Role.ADMIN, Role.MEMBER],
            {
                event: SseEventNames.MULTI_EVENT,
                data: {
                    reason: EventReason.USER_DELETED,
                    originId: deletedUser.id,
                },
                id: uuidv4(),
            }
        );
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

        const updatedUser = await prismaErrorHandler(async () => {
            return await prisma.user.update({
                where: {
                    id: userId,
                },
                data: {
                    role: 'MEMBER',
                },
                select: {
                    id: true,
                    role: true,
                },
            });
        });

        logger.info(
            { userId, role: 'MEMBER' },
            'User role set in database successfully.'
        );

        // Since this is a role change event, we need only send this to the roles who
        // can actually view the roles of users, i.e. ADMIN and MEMBER roles.
        const multiEventPayloadDto: MultiEventPayloadDto = {
            reason: EventReason.MEMBER_UPDATE,
            originId: updatedUser.id,
        };
        sseService.multicastEventToRoles<SseEventNamesType, MultiEventPayloadDto>(
            [Role.ADMIN, Role.MEMBER],
            {
                event: SseEventNames.MULTI_EVENT,
                data: multiEventPayloadDto,
                id: uuidv4(),
            }
        );
    }

    async updateRole(
        adminId: number,
        adminUsername: string,
        username: string,
        role: Role
    ): Promise<void> {
        logger.info({ username, newRole: role }, 'Updating user role in database.');

        const userDetails = await prismaErrorHandler(async () => {
            return await prisma.$transaction(async (tx) => {
                const details = await tx.user.findUnique({
                    where: {
                        username,
                    },
                    select: {
                        id: true,
                        role: true,
                    },
                });

                if (!details) {
                    throw new InternalServerError(
                        'User not found in database.',
                        ErrorCodes.DATABASE_ERROR
                    );
                }

                await tx.user.update({
                    where: {
                        username,
                    },
                    data: {
                        role,
                    },
                });

                return {
                    id: details.id,
                    initialRole: details.role,
                };
            });
        });

        logger.info({ username, newRole: role }, 'User role updated successfully.');

        // Since this is a role change event, we need only send this to the roles who
        // can actually view the roles of users, i.e. ADMIN and MEMBER roles.
        const multiEventPayloadDto: MultiEventPayloadDto = {
            reason: EventReason.ROLE_CHANGE,
            originId: adminId,
            originUsername: adminUsername,
            targetId: userDetails.id,
            targetUserRole: role,
        };
        sseService.multicastEventToRoles<SseEventNamesType, MultiEventPayloadDto>(
            [Role.ADMIN, Role.MEMBER],
            {
                event: SseEventNames.MULTI_EVENT,
                data: multiEventPayloadDto,
                id: uuidv4(),
            }
        );
        // In case the user whose role is being updated is of USER role, we send the
        // event to the user as well in order to show UI updates.
        if (userDetails.initialRole === 'USER') {
            sseService.unicastEvent<SseEventNamesType, MultiEventPayloadDto>(
                userDetails.id,
                {
                    event: SseEventNames.MULTI_EVENT,
                    data: multiEventPayloadDto,
                    id: uuidv4(),
                }
            );
        }
    }

    async uploadUserAvatar(
        userPayload: AccessTokenPayload,
        avatarImage: Buffer
    ): Promise<UploadAvatarServiceReturnType> {
        logger.info(
            { username: userPayload.username },
            'Uploading user avatar to database and cloudinary.'
        );

        const avatarPublicId = await uploadFile(avatarImage, userPayload.username);
        const currentAvatar = await prismaErrorHandler(async () => {
            return await prisma.$transaction(async (tx) => {
                const userData = await tx.user.findUnique({
                    where: {
                        id: userPayload.id,
                    },
                    select: {
                        avatar: true,
                    },
                });

                await tx.user.update({
                    where: {
                        id: userPayload.id,
                    },
                    data: {
                        avatar: avatarPublicId,
                    },
                });

                return userData?.avatar;
            });
        });

        if (currentAvatar) {
            logger.info(
                { currentAvatar },
                'Deleting current avatar from cloudinary.'
            );
            await deleteFile(currentAvatar);
        }

        logger.info(
            { username: userPayload.username },
            'User avatar uploaded to database and cloudinary successfully.'
        );

        // We need only send this event to the roles who can actually view the
        // profile details of users, i.e. ADMIN and MEMBER roles.
        sseService.multicastEventToRoles<SseEventNamesType, MultiEventPayloadDto>(
            [Role.ADMIN, Role.MEMBER],
            {
                event: SseEventNames.MULTI_EVENT,
                data: {
                    reason: EventReason.USER_UPDATED,
                    originId: userPayload.id,
                },
                id: uuidv4(),
            }
        );

        return {
            avatar: avatarPublicId,
        };
    }

    async deleteUserAvatar(username: string): Promise<void> {
        logger.info(
            { username },
            'Deleting user avatar from database and cloudinary.'
        );

        const user = await prismaErrorHandler(async () => {
            return await prisma.$transaction(async (tx) => {
                const user = await tx.user.findUnique({
                    where: {
                        username,
                    },
                    select: {
                        avatar: true,
                        id: true,
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

                return {
                    avatarPublicId: user.avatar,
                    userId: user.id,
                };
            });
        });

        await deleteFile(user.avatarPublicId);

        logger.info(
            { username },
            'User avatar deleted from database and cloudinary successfully.'
        );

        // We need only send this event to the roles who can actually view the
        // avatar of users, i.e. ADMIN and MEMBER roles.
        sseService.multicastEventToRoles<SseEventNamesType, MultiEventPayloadDto>(
            [Role.ADMIN, Role.MEMBER],
            {
                event: SseEventNames.MULTI_EVENT,
                data: {
                    reason: EventReason.USER_UPDATED,
                    originId: user.userId,
                },
                id: uuidv4(),
            }
        );
    }

    async getUserBookmarks(
        userId: number
    ): Promise<GetUserBookmarksServiceReturnType> {
        logger.info({ userId }, 'Getting user bookmarks from database.');

        const bookmarks: GetUserBookmarksServiceReturnType =
            await prismaErrorHandler(async () => {
                return await prisma.bookmark.findMany({
                    where: {
                        userId,
                    },
                    include: {
                        message: {
                            include: {
                                author: {
                                    omit: {
                                        password: true,
                                    },
                                },
                                likes: true,
                                bookmarks: true,
                            },
                        },
                    },
                });
            });

        logger.info(
            { userId },
            'User bookmarks retrieved from database successfully.'
        );

        return bookmarks;
    }

    async addBookmark(userId: number, messageId: number): Promise<void> {
        logger.info({ userId, messageId }, 'Adding bookmark to database.');

        const bookmark: Bookmark = await prismaErrorHandler(async () => {
            return await prisma.bookmark.create({
                data: {
                    userId,
                    messageId,
                },
            });
        });

        logger.info(
            { id: bookmark.id, userId, messageId },
            'Bookmark added to database successfully.'
        );
    }

    async removeBookmark(userId: number, messageId: number): Promise<void> {
        logger.info({ userId, messageId }, 'Removing bookmark from database.');

        await prismaErrorHandler(async () => {
            return await prisma.bookmark.delete({
                where: {
                    userId_messageId: {
                        userId,
                        messageId,
                    },
                },
            });
        });

        logger.info(
            { userId, messageId },
            'Bookmark removed from database successfully.'
        );
    }
}

export const userService = new UserService();
