import jwt from 'jsonwebtoken';
import jwtErrorHandler from '../../core/utils/jwtErrorHandler.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import { UnauthorizedError } from '../../core/errors/customErrors.js';
import { config } from '../../core/config/index.js';
import { AccessTokenPayloadSchema } from '../auth/auth.types.js';
import { sseService } from './sse.service.js';
import type { Request, Response } from 'express';
import type {
    ApiErrorPayload,
    ApiResponseError,
    EventRequestQueryDto,
    Role,
} from '@blue0206/members-only-shared-types';
import type { AccessTokenPayload } from '../auth/auth.types.js';

export const sseConnectionHandler = (
    req: Request<unknown, unknown, unknown, EventRequestQueryDto>,
    res: Response
): Promise<void> | void => {
    let userId: number;
    let userRole: Role;

    try {
        const accessToken = jwtErrorHandler((): AccessTokenPayload => {
            if (!req.query.accessToken) {
                throw new UnauthorizedError(
                    'Missing access token.',
                    ErrorCodes.AUTHENTICATION_REQUIRED
                );
            }
            const decodedToken = jwt.verify(
                req.query.accessToken,
                config.ACCESS_TOKEN_SECRET
            );

            // Parse the decoded token against the defined zod schema. This approach
            // is more type safe and asserts consistency in payloads across signing and verification.
            const parsedToken = AccessTokenPayloadSchema.parse(decodedToken);

            return parsedToken;
        }, req.log);

        req.log = req.log.child({
            userId: accessToken.id,
            username: accessToken.username,
            userRole: accessToken.role,
        });

        userId = accessToken.id;
        userRole = accessToken.role;
    } catch (error: unknown) {
        req.log.error(
            { error },
            'Attempt to establish SSE connection without authentication.'
        );

        const errorPayload: ApiErrorPayload = {
            code: ErrorCodes.AUTHENTICATION_REQUIRED,
            message: 'Authentication required to establish SSE connection.',
            statusCode: 401,
            details: error,
        };
        const errorResponse: ApiResponseError = {
            success: false,
            errorPayload,
            requestId: req.requestId,
        };
        res.status(401).json(errorResponse);
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseService.addClient({ userId, userRole, res, req });
};
