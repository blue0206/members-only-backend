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
import requestValidator from '../../core/middlewares/requestValidator.js';
import {
    LoginRequestSchema,
    RegisterRequestSchema,
    SessionIdParamsSchema,
} from '@blue0206/members-only-shared-types';

const authRouter = Router();

authRouter.post(
    '/register',
    multerMiddleware,
    requestValidator({ schema: RegisterRequestSchema, type: 'body' }),
    assignClientDetails,
    registerUser
);
authRouter.post(
    '/login',
    requestValidator({ schema: LoginRequestSchema, type: 'body' }),
    assignClientDetails,
    loginUser
);

// Protected routes.
authRouter.delete(
    '/logout',
    accessTokenVerification,
    csrfVerification,
    lastActiveUpdateMiddleware,
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
    csrfVerification,
    lastActiveUpdateMiddleware,
    getSessions
);
authRouter.delete(
    '/sessions/:sessionId',
    accessTokenVerification,
    csrfVerification,
    lastActiveUpdateMiddleware,
    requestValidator({ schema: SessionIdParamsSchema, type: 'params' }),
    revokeSession
);
authRouter.delete(
    '/sessions',
    accessTokenVerification,
    csrfVerification,
    lastActiveUpdateMiddleware,
    revokeAllOtherSessions
);

export default authRouter;
