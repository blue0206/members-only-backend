import { Router } from 'express';
import {
    loginUser,
    registerUser,
    logoutUser,
    refreshUserTokens,
    getSessions,
    revokeSession,
} from './auth.controller.js';
import accessTokenVerification from '../../core/middlewares/accessTokenVerification.js';
import csrfVerification from '../../core/middlewares/csrfVerification.js';
import multerMiddleware from '../../core/middlewares/multerMiddleware.js';
import assignClientDetails from '../../core/middlewares/assignClientDetails.js';

const authRouter = Router();

authRouter.post('/register', multerMiddleware, assignClientDetails, registerUser);
authRouter.post('/login', assignClientDetails, loginUser);

// Protected routes.
authRouter.delete('/logout', accessTokenVerification, csrfVerification, logoutUser);
authRouter.post(
    '/refresh',
    csrfVerification,
    assignClientDetails,
    refreshUserTokens
);
authRouter.get('/sessions', accessTokenVerification, csrfVerification, getSessions);
authRouter.delete(
    '/sessions/:sessionId',
    accessTokenVerification,
    csrfVerification,
    revokeSession
);

export default authRouter;
