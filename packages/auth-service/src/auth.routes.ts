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
import {
    accessTokenVerification,
    csrfVerification,
    multerMiddleware,
    assignClientDetails,
    tokenRotationCleanupMiddleware,
    lastActiveUpdateMiddleware,
    requestValidator,
} from '@members-only/core-utils';
import {
    LoginRequestSchema,
    RegisterRequestSchema,
    SessionIdParamsSchema,
} from '@blue0206/members-only-shared-types';
import type { Router as ExpressRouter } from 'express';

const authRouter: ExpressRouter = Router();

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
