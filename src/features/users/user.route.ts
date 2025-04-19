import { Router } from 'express';
import accessTokenVerification from '../../core/middlewares/accessTokenVerification.js';
import { userMessages } from './user.controller.js';

const userRouter = Router();

// Protected Routes
userRouter.get('/messages', accessTokenVerification, userMessages);

export default userRouter;
