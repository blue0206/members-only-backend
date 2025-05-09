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
    userMessages,
} from './user.controller.js';
import multerMiddleware from '../../core/middlewares/multerMiddleware.js';

const userRouter = Router();

//-----------Protected Routes-----------

// Get all of the user's messages.
userRouter.get('/messages', accessTokenVerification, userMessages);

// Update user details (except password).
userRouter.patch(
    '/',
    accessTokenVerification,
    csrfVerification,
    multerMiddleware,
    editUser
);

// Allow admin to delete other users.
userRouter.delete(
    '/:username',
    accessTokenVerification,
    csrfVerification,
    adminVerification,
    adminDeleteUser
);

// Allow users to delete their account.
userRouter.delete('/', accessTokenVerification, csrfVerification, deleteUserAccount);

// Reset Password
userRouter.patch(
    '/reset-password',
    accessTokenVerification,
    csrfVerification,
    resetUserPassword
);

// Promote user to member if they provide correct secret key.
userRouter.patch(
    '/role',
    accessTokenVerification,
    csrfVerification,
    memberRoleUpdate
);

// Allow admin to set role of other users.
userRouter.patch(
    '/role/:username',
    accessTokenVerification,
    csrfVerification,
    adminVerification,
    setRole
);

// Allow registered users to delete avatar.
userRouter.delete(
    '/avatar',
    accessTokenVerification,
    csrfVerification,
    deleteUserAvatar
);

export default userRouter;
