import { Router } from 'express';
import accessTokenVerification from '../../core/middlewares/accessTokenVerification.js';
import csrfVerification from '../../core/middlewares/csrfVerification.js';
import { editUser, userMessages } from './user.controller.js';

const userRouter = Router();

// Protected Routes
userRouter.get('/messages', accessTokenVerification, userMessages);
userRouter.patch('/', accessTokenVerification, csrfVerification, editUser);

export default userRouter;
