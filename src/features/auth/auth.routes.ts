import { Router } from 'express';
import {
    loginUser,
    registerUser,
    logoutUser,
    refreshUserTokens,
    getSessions,
    revokeSession,
    revokeAllOtherSessions,
} from './auth.controller.js';
import accessTokenVerification from '../../core/middlewares/accessTokenVerification.js';
import csrfVerification from '../../core/middlewares/csrfVerification.js';
import multerMiddleware from '../../core/middlewares/multerMiddleware.js';
import assignClientDetails from '../../core/middlewares/assignClientDetails.js';
import tokenRotationCleanupMiddleware from '../../core/middlewares/tokenRotationCleanupMiddleware.js';
import lastActiveUpdateMiddleware from '../../core/middlewares/lastActiveUpdateMiddleware.js';

const authRouter = Router();

authRouter.post('/register', multerMiddleware, assignClientDetails, registerUser);
authRouter.post('/login', assignClientDetails, loginUser);

// Protected routes.
authRouter.delete(
    '/logout',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    csrfVerification,
    logoutUser
);
authRouter.post(
    '/refresh',
    tokenRotationCleanupMiddleware,
    csrfVerification,
    assignClientDetails,
    refreshUserTokens
);
authRouter.get(
    '/sessions',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    csrfVerification,
    getSessions
);
authRouter.delete(
    '/sessions/:sessionId',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    csrfVerification,
    revokeSession
);
authRouter.delete(
    '/sessions',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    csrfVerification,
    revokeAllOtherSessions
);

export default authRouter;
