import { prisma } from '@members-only/database';
import { config } from '@members-only/core-utils/env';
import { prismaErrorHandler } from '@members-only/core-utils/utils/prismaErrorHandler';
import { deleteFile, uploadFile } from '@members-only/core-utils/cloudinary';
import {
    InternalServerError,
    UnauthorizedError,
} from '@members-only/core-utils/errors';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import bcrypt from 'bcrypt';
// import { v4 as uuidv4 } from 'uuid';
import type {
    EditUserServiceReturnType,
    GetUserBookmarksServiceReturnType,
    GetUsersServiceReturnType,
    UploadAvatarServiceReturnType,
} from './user.types.js';
import type {
    EditUserRequestDto,
    ResetPasswordRequestDto,
    Role,
} from '@blue0206/members-only-shared-types';
import type { Bookmark, User } from '@members-only/database';
import type { AccessTokenPayload } from '@members-only/core-utils/authTypes';
import type { Logger } from '@members-only/core-utils/logger';

// TODO: Handle SSE events for real-time updates.
class UserService {
    async getUsers(log: Logger): Promise<GetUsersServiceReturnType> {
        log.info('Getting all users from database.');

        const users: GetUsersServiceReturnType = await prismaErrorHandler(
            async () => {
                return await prisma.user.findMany({
                    omit: {
                        password: true,
                    },
                });
            },
            log
        );

        log.info('Users retrieved from database successfully.');
        return users;
    }

    async editUser(
        updateData: EditUserRequestDto,
        userPayload: AccessTokenPayload,
        log: Logger
    ): Promise<EditUserServiceReturnType> {
        log.info('Updating user details in database.');

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
            },
            log
        );

        log.info(
            {
                newUsername: user.username,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            'User details updated in database successfully.'
        );

        // We need only send this event to the roles who can actually view the
        // profile details of users, i.e. ADMIN and MEMBER roles.
        // sseService.multicastEventToRoles<SseEventNamesType, MultiEventPayloadDto>(
        //     [Role.ADMIN, Role.MEMBER],
        //     {
        //         event: SseEventNames.MULTI_EVENT,
        //         data: {
        //             reason: EventReason.USER_UPDATED,
        //             originId: user.id,
        //         },
        //         id: uuidv4(),
        //     }
        // );

        return user;
    }

    // Endpoint for ADMINs to delete user.
    async deleteUserByUsername(
        username: string,
        adminId: number,
        log: Logger
    ): Promise<void> {
        log.info({ usernameToDelete: username }, 'Deleting user from database.');

        const deletedUser = await prismaErrorHandler(async () => {
            return await prisma.user.delete({
                where: {
                    username,
                },
            });
        }, log);

        log.info(
            { deletedUsername: username },
            'User deleted from database successfully.'
        );

        // We only send this to the roles who can actually view the other users,
        // i.e. ADMIN and MEMBER roles.
        // const multiEventPayloadDto: MultiEventPayloadDto = {
        //     reason: EventReason.USER_DELETED_BY_ADMIN,
        //     originId: adminId,
        //     targetId: deletedUser.id,
        // };
        // sseService.multicastEventToRoles<SseEventNamesType, MultiEventPayloadDto>(
        //     [Role.ADMIN, Role.MEMBER],
        //     {
        //         event: SseEventNames.MULTI_EVENT,
        //         data: multiEventPayloadDto,
        //         id: uuidv4(),
        //     }
        // );
        // In case the affected user is of USER role, we send the
        // event to the user as well in order clear their client state.
        // if (deletedUser.role === 'USER') {
        //     sseService.unicastEvent<SseEventNamesType, MultiEventPayloadDto>(
        //         deletedUser.id,
        //         {
        //             event: SseEventNames.MULTI_EVENT,
        //             data: multiEventPayloadDto,
        //             id: uuidv4(),
        //         }
        //     );
        // }

        if (deletedUser.avatar) {
            await deleteFile(deletedUser.avatar, log);
            log.info(
                { deletedUserAvatar: deletedUser.avatar },
                "Deleted user's avatar removed from cloudinary."
            );
        }
    }

    // Endpoint for users to delete their own account.
    async deleteAccount(userId: number, log: Logger): Promise<void> {
        log.info('Deleting user from database.');

        const deletedUser = await prismaErrorHandler(async () => {
            return await prisma.user.delete({
                where: {
                    id: userId,
                },
            });
        }, log);

        log.info('User deleted from database successfully.');

        // We only send this to the roles who can actually view the other users,
        // i.e. ADMIN and MEMBER roles.
        // sseService.multicastEventToRoles<SseEventNamesType, MultiEventPayloadDto>(
        //     [Role.ADMIN, Role.MEMBER],
        //     {
        //         event: SseEventNames.MULTI_EVENT,
        //         data: {
        //             reason: EventReason.USER_DELETED,
        //             originId: deletedUser.id,
        //         },
        //         id: uuidv4(),
        //     }
        // );

        if (deletedUser.avatar) {
            await deleteFile(deletedUser.avatar, log);
            log.info(
                { avatar: deletedUser.avatar },
                "Deleted user's avatar removed from cloudinary."
            );
        }
    }

    async resetPassword(
        passData: ResetPasswordRequestDto,
        userId: number,
        log: Logger
    ): Promise<void> {
        log.info('Resetting user password in database.');

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
            },
            log
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
        }, log);

        log.info('User password reset in database successfully.');
    }

    async setMemberRole(
        userId: number,
        secretKey: string,
        log: Logger
    ): Promise<void> {
        log.info('Setting user role in database.');

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
        }, log);

        log.info(
            { newRole: updatedUser.role },
            'User role set in database successfully.'
        );

        // Since this is a role change event, we need only send this to the roles who
        // can actually view the roles of users, i.e. ADMIN and MEMBER roles.
        // const multiEventPayloadDto: MultiEventPayloadDto = {
        //     reason: EventReason.MEMBER_UPDATE,
        //     originId: updatedUser.id,
        // };
        // sseService.multicastEventToRoles<SseEventNamesType, MultiEventPayloadDto>(
        //     [Role.ADMIN, Role.MEMBER],
        //     {
        //         event: SseEventNames.MULTI_EVENT,
        //         data: multiEventPayloadDto,
        //         id: uuidv4(),
        //     }
        // );
    }

    async updateRole(
        adminId: number,
        adminUsername: string,
        username: string,
        role: Role,
        log: Logger
    ): Promise<void> {
        log.info(
            { usernameToBeUpdated: username, newRoleToBeUpdated: role },
            'Updating user role in database.'
        );

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
        }, log);

        log.info(
            { updatedUser: username, newRole: role },
            'User role updated successfully.'
        );

        // Since this is a role change event, we need only send this to the roles who
        // can actually view the roles of users, i.e. ADMIN and MEMBER roles.
        // const multiEventPayloadDto: MultiEventPayloadDto = {
        //     reason: EventReason.ROLE_CHANGE,
        //     originId: adminId,
        //     originUsername: adminUsername,
        //     targetId: userDetails.id,
        //     targetUserRole: role,
        // };
        // sseService.multicastEventToRoles<SseEventNamesType, MultiEventPayloadDto>(
        //     [Role.ADMIN, Role.MEMBER],
        //     {
        //         event: SseEventNames.MULTI_EVENT,
        //         data: multiEventPayloadDto,
        //         id: uuidv4(),
        //     }
        // );
        // In case the user whose role is being updated is of USER role, we send the
        // event to the user as well in order to show UI updates.
        if (userDetails.initialRole === 'USER') {
            // sseService.unicastEvent<SseEventNamesType, MultiEventPayloadDto>(
            //     userDetails.id,
            //     {
            //         event: SseEventNames.MULTI_EVENT,
            //         data: multiEventPayloadDto,
            //         id: uuidv4(),
            //     }
            // );
        }
    }

    async uploadUserAvatar(
        userPayload: AccessTokenPayload,
        avatarImage: Buffer,
        log: Logger
    ): Promise<UploadAvatarServiceReturnType> {
        log.info('Uploading user avatar to database and cloudinary.');

        const avatarPublicId = await uploadFile(
            avatarImage,
            userPayload.username,
            log
        );
        let currentAvatar: string | null | undefined;
        try {
            currentAvatar = await prismaErrorHandler(async () => {
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
            }, log);
        } catch (error) {
            // Revert upload if DB op fails.
            log.error('Error uploading user avatar to database. Reverting upload.');
            await deleteFile(avatarPublicId, log);

            throw error;
        }

        if (currentAvatar) {
            log.info({ currentAvatar }, 'Deleting current avatar from cloudinary.');
            await deleteFile(currentAvatar, log);
        }

        log.info('User avatar uploaded to database and cloudinary successfully.');

        // We need only send this event to the roles who can actually view the
        // profile details of users, i.e. ADMIN and MEMBER roles.
        // sseService.multicastEventToRoles<SseEventNamesType, MultiEventPayloadDto>(
        //     [Role.ADMIN, Role.MEMBER],
        //     {
        //         event: SseEventNames.MULTI_EVENT,
        //         data: {
        //             reason: EventReason.USER_UPDATED,
        //             originId: userPayload.id,
        //         },
        //         id: uuidv4(),
        //     }
        // );

        return {
            avatar: avatarPublicId,
        };
    }

    async deleteUserAvatar(username: string, log: Logger): Promise<void> {
        log.info('Deleting user avatar from database and cloudinary.');

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
        }, log);

        await deleteFile(user.avatarPublicId, log);

        log.info('User avatar deleted from database and cloudinary successfully.');

        // We need only send this event to the roles who can actually view the
        // avatar of users, i.e. ADMIN and MEMBER roles.
        // sseService.multicastEventToRoles<SseEventNamesType, MultiEventPayloadDto>(
        //     [Role.ADMIN, Role.MEMBER],
        //     {
        //         event: SseEventNames.MULTI_EVENT,
        //         data: {
        //             reason: EventReason.USER_UPDATED,
        //             originId: user.userId,
        //         },
        //         id: uuidv4(),
        //     }
        // );
    }

    async getUserBookmarks(
        userId: number,
        log: Logger
    ): Promise<GetUserBookmarksServiceReturnType> {
        log.info('Getting user bookmarks from database.');

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
            }, log);

        log.info('User bookmarks retrieved from database successfully.');

        return bookmarks;
    }

    async addBookmark(
        userId: number,
        messageId: number,
        log: Logger
    ): Promise<void> {
        log.info({ messageId }, 'Adding bookmark to database.');

        const bookmark: Bookmark = await prismaErrorHandler(async () => {
            return await prisma.bookmark.create({
                data: {
                    userId,
                    messageId,
                },
            });
        }, log);

        log.info(
            { bookmarkId: bookmark.id, messageId },
            'Bookmark added to database successfully.'
        );
    }

    async removeBookmark(
        userId: number,
        messageId: number,
        log: Logger
    ): Promise<void> {
        log.info({ messageId }, 'Removing bookmark from database.');

        await prismaErrorHandler(async () => {
            return await prisma.bookmark.delete({
                where: {
                    userId_messageId: {
                        userId,
                        messageId,
                    },
                },
            });
        }, log);

        log.info({ messageId }, 'Bookmark removed from database successfully.');
    }
}

export const userService = new UserService();
