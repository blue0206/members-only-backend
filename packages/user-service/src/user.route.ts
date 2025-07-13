import { Router } from 'express';
import { accessTokenVerification } from '@members-only/core-utils/middlewares/accessTokenVerification';
import { csrfVerification } from '@members-only/core-utils/middlewares/csrfVerification';
import { adminVerification } from '@members-only/core-utils/middlewares/adminVerification';
import { multerMiddleware } from '@members-only/core-utils/middlewares/multerMiddleware';
import { memberVerification } from '@members-only/core-utils/middlewares/memberVerification';
import { lastActiveUpdateMiddleware } from '@members-only/core-utils/middlewares/lastActiveUpdateMiddleware';
import { requestValidator } from '@members-only/core-utils/middlewares/requestValidator';
import {
    adminDeleteUser,
    deleteUserAccount,
    deleteUserAvatar,
    editUser,
    memberRoleUpdate,
    resetUserPassword,
    setRole,
    getUsers,
    userBookmarks,
    addUserBookmark,
    removeUserBookmark,
    uploadUserAvatar,
} from './user.controller.js';
import { MessageParamsSchema } from '@blue0206/members-only-shared-types/dtos/message.dto';
import {
    EditUserRequestSchema,
    MemberRoleUpdateRequestSchema,
    ResetPasswordRequestSchema,
    SetRoleRequestQuerySchema,
    UsernameParamsSchema,
} from '@blue0206/members-only-shared-types/dtos/user.dto';
import type { Router as ExpressRouter, Request, Response } from 'express';

const userRouter: ExpressRouter = Router();

userRouter.get('/healthcheck', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'user-service' });
});

//-----------Protected Routes-----------

// Get bookmarked messages of Admin/Member users.
userRouter.get(
    '/bookmarks',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    memberVerification,
    userBookmarks
);

// Get all the users.
userRouter.get(
    '/',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    adminVerification,
    getUsers
);

// Add bookmark.
userRouter.post(
    '/bookmarks/:messageId',
    accessTokenVerification,
    csrfVerification,
    memberVerification,
    lastActiveUpdateMiddleware,
    requestValidator({ schema: MessageParamsSchema, type: 'params' }),
    addUserBookmark
);

// Reset Password
userRouter.patch(
    '/reset-password',
    accessTokenVerification,
    csrfVerification,
    lastActiveUpdateMiddleware,
    requestValidator({ schema: ResetPasswordRequestSchema, type: 'body' }),
    resetUserPassword
);

// Promote user to member if they provide correct secret key.
userRouter.patch(
    '/role',
    accessTokenVerification,
    csrfVerification,
    lastActiveUpdateMiddleware,
    requestValidator({ schema: MemberRoleUpdateRequestSchema, type: 'body' }),
    memberRoleUpdate
);

// Allow admin to set role of other users.
userRouter.patch(
    '/role/:username',
    accessTokenVerification,
    csrfVerification,
    adminVerification,
    lastActiveUpdateMiddleware,
    requestValidator(
        { schema: UsernameParamsSchema, type: 'params' },
        { schema: SetRoleRequestQuerySchema, type: 'query' }
    ),
    setRole
);

// Allow registered users to update avatar.
userRouter.patch(
    '/avatar',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    csrfVerification,
    multerMiddleware,
    uploadUserAvatar
);

// Update user details (except password and avatar).
userRouter.patch(
    '/',
    accessTokenVerification,
    csrfVerification,
    lastActiveUpdateMiddleware,
    requestValidator({ schema: EditUserRequestSchema, type: 'body' }),
    editUser
);

// Remove bookmark.
userRouter.delete(
    '/bookmarks/:messageId',
    accessTokenVerification,
    csrfVerification,
    memberVerification,
    lastActiveUpdateMiddleware,
    requestValidator({ schema: MessageParamsSchema, type: 'params' }),
    removeUserBookmark
);

// Allow registered users to delete avatar.
userRouter.delete(
    '/avatar',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    csrfVerification,
    deleteUserAvatar
);

// Allow admin to delete other users.
userRouter.delete(
    '/:username',
    accessTokenVerification,
    csrfVerification,
    adminVerification,
    lastActiveUpdateMiddleware,
    requestValidator({ schema: UsernameParamsSchema, type: 'params' }),
    adminDeleteUser
);

// Allow users to delete their account.
userRouter.delete(
    '/',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    csrfVerification,
    deleteUserAccount
);

export default userRouter;
