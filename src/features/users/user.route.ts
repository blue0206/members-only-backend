import { Router } from 'express';
import accessTokenVerification from '../../core/middlewares/accessTokenVerification.js';
import csrfVerification from '../../core/middlewares/csrfVerification.js';
import adminVerification from '../../core/middlewares/adminVerification.js';
import { adminDeleteUser, editUser, userMessages } from './user.controller.js';

const userRouter = Router();

// Protected Routes
userRouter.get('/messages', accessTokenVerification, userMessages);
userRouter.patch('/', accessTokenVerification, csrfVerification, editUser);
userRouter.delete(
    '/:username',
    accessTokenVerification,
    csrfVerification,
    adminVerification,
    adminDeleteUser
); // For Admin deleting other users.

export default userRouter;
