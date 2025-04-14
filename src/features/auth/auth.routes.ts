import { Router } from 'express';
import { loginUser, registerUser } from './auth.controller.js';
import accessTokenVerification from '../../core/middlewares/accessTokenVerification.js';

const authRouter = Router();

authRouter.post('/register', registerUser);
authRouter.post('/login', loginUser);

// Protected routes.
authRouter.delete('/logout', accessTokenVerification);
authRouter.post('/refresh', accessTokenVerification);

export default authRouter;
