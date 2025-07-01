import { Router } from 'express';
import accessTokenVerification from '../../core/middlewares/accessTokenVerification.js';
import csrfVerification from '../../core/middlewares/csrfVerification.js';
import adminVerification from '../../core/middlewares/adminVerification.js';
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
import multerMiddleware from '../../core/middlewares/multerMiddleware.js';
import memberVerification from '../../core/middlewares/memberVerification.js';
import lastActiveUpdateMiddleware from '../../core/middlewares/lastActiveUpdateMiddleware.js';
import requestValidator from '../../core/middlewares/requestValidator.js';
import {
    EditUserRequestSchema,
    MemberRoleUpdateRequestSchema,
    MessageParamsSchema,
    ResetPasswordRequestSchema,
    SetRoleRequestQuerySchema,
    UsernameParamsSchema,
} from '@blue0206/members-only-shared-types';

const userRouter = Router();

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
