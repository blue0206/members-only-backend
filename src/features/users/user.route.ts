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
    lastActiveUpdateMiddleware,
    csrfVerification,
    memberVerification,
    addUserBookmark
);

// Reset Password
userRouter.patch(
    '/reset-password',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    csrfVerification,
    resetUserPassword
);

// Promote user to member if they provide correct secret key.
userRouter.patch(
    '/role',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    csrfVerification,
    memberRoleUpdate
);

// Allow admin to set role of other users.
userRouter.patch(
    '/role/:username',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    csrfVerification,
    adminVerification,
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
    lastActiveUpdateMiddleware,
    csrfVerification,
    editUser
);

// Remove bookmark.
userRouter.delete(
    '/bookmarks/:messageId',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    csrfVerification,
    memberVerification,
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
    lastActiveUpdateMiddleware,
    csrfVerification,
    adminVerification,
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
