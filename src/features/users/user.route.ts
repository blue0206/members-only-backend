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
} from './user.controller.js';
import multerMiddleware from '../../core/middlewares/multerMiddleware.js';
import memberVerification from '../../core/middlewares/memberVerification.js';
import lastActiveUpdateMiddleware from '../../core/middlewares/lastActiveUpdateMiddleware.js';

const userRouter = Router();

//-----------Protected Routes-----------

// Get all the users.
userRouter.get(
    '/',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    adminVerification,
    getUsers
);

// Update user details (except password).
userRouter.patch(
    '/',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    csrfVerification,
    multerMiddleware,
    editUser
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

// Allow registered users to delete avatar.
userRouter.delete(
    '/avatar',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    csrfVerification,
    deleteUserAvatar
);

// Get bookmarked messages of Admin/Member users.
userRouter.get(
    '/bookmarks',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    memberVerification,
    userBookmarks
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

// Remove bookmark.
userRouter.delete(
    '/bookmarks/:messageId',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    csrfVerification,
    memberVerification,
    removeUserBookmark
);

export default userRouter;
