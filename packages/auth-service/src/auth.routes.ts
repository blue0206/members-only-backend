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
    LoginRequestSchema,
    RegisterRequestSchema,
    SessionIdParamsSchema,
} from '@blue0206/members-only-shared-types/dtos/auth.dto';
import { accessTokenVerification } from '@members-only/core-utils/middlewares/accessTokenVerification';
import { csrfVerification } from '@members-only/core-utils/middlewares/csrfVerification';
import { multerMiddleware } from '@members-only/core-utils/middlewares/multerMiddleware';
import { assignClientDetails } from '@members-only/core-utils/middlewares/assignClientDetails';
import { tokenRotationCleanupMiddleware } from '@members-only/core-utils/middlewares/tokenRotationCleanupMiddleware';
import { lastActiveUpdateMiddleware } from '@members-only/core-utils/middlewares/lastActiveUpdateMiddleware';
import { requestValidator } from '@members-only/core-utils/middlewares/requestValidator';
import type { Router as ExpressRouter, Request, Response } from 'express';

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
authRouter.get('/healthcheck', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'auth-service' });
});
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
