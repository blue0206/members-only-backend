import jwt from 'jsonwebtoken';
import {
    ErrorCodes,
    EventRequestQuerySchema,
} from '@blue0206/members-only-shared-types';
import {
    UnauthorizedError,
    ValidationError,
} from '../../core/errors/customErrors.js';
import { config } from '../../core/config/index.js';
import { AccessTokenPayloadSchema } from '../auth/auth.types.js';
import jwtErrorHandler from '../../core/utils/jwtErrorHandler.js';
import type { Request, Response } from 'express';
import type {
    ApiErrorPayload,
    ApiResponseError,
    EventRequestQueryDto,
    Role,
} from '@blue0206/members-only-shared-types';
import type { AccessTokenPayload } from '../auth/auth.types.js';
import { logger } from '../../core/logger.js';
import { sseService } from './sse.service.js';

export const sseConnectionHandler = (
    req: Request,
    res: Response
): Promise<void> | void => {
    const parsedQuery = EventRequestQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
        throw new ValidationError(
            'Invalid request query.',
            ErrorCodes.VALIDATION_ERROR,
            parsedQuery.error.flatten()
        );
    }
    const queryDto: EventRequestQueryDto = parsedQuery.data;

    let userId: number;
    let userRole: Role;

    try {
        const accessToken = jwtErrorHandler((): AccessTokenPayload => {
            if (!queryDto.accessToken) {
                throw new UnauthorizedError(
                    'Missing access token.',
                    ErrorCodes.AUTHENTICATION_REQUIRED
                );
            }
            const decodedToken = jwt.verify(
                queryDto.accessToken,
                config.ACCESS_TOKEN_SECRET
            );

            // Parse the decoded token against the defined zod schema. This approach
            // is more type safe and asserts consistency in payloads across signing and verification.
            const parsedToken = AccessTokenPayloadSchema.parse(decodedToken);

            return parsedToken;
        });

        userId = accessToken.id;
        userRole = accessToken.role;
    } catch (error: unknown) {
        logger.error(
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
