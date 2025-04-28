import { Router } from 'express';
import {
    loginUser,
    registerUser,
    logoutUser,
    refreshUserTokens,
} from './auth.controller.js';
import accessTokenVerification from '../../core/middlewares/accessTokenVerification.js';
import csrfVerification from '../../core/middlewares/csrfVerification.js';
import multerMiddleware from '../../core/middlewares/multerMiddleware.js';

const authRouter = Router();

authRouter.post('/register', multerMiddleware, registerUser);
authRouter.post('/login', loginUser);

// Protected routes.
authRouter.delete('/logout', accessTokenVerification, csrfVerification, logoutUser);
authRouter.post('/refresh', csrfVerification, refreshUserTokens);

export default authRouter;
