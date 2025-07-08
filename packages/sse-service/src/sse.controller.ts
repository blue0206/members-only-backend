import jwt from 'jsonwebtoken';
import { jwtErrorHandler } from '@members-only/core-utils/utils/jwtErrorHandler';
import { ErrorCodes } from '@blue0206/members-only-shared-types/api/error-codes';
import { UnauthorizedError } from '@members-only/core-utils/errors';
import { config } from '@members-only/core-utils/env';
import { AccessTokenPayloadSchema } from '@members-only/core-utils/authTypes';
import { sseService } from './sse.service.js';
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response } from 'express';
import type {
    ApiErrorPayload,
    ApiResponseError,
} from '@blue0206/members-only-shared-types/api/base';
import type {
    EventRequestDto,
    EventRequestQueryDto,
} from '@blue0206/members-only-shared-types/dtos/event.dto';
import type { Role } from '@blue0206/members-only-shared-types/enums/roles.enum';
import type { AccessTokenPayload } from '@members-only/core-utils/authTypes';

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

// Controller for Internal API to dispatch event
export const dispatchEvent = (
    req: Request<unknown, unknown, EventRequestDto>,
    res: Response
): void => {
    // Verify api secret key to ensure request is coming from internal API.
    if (!req.headers['x-internal-api-secret']) {
        req.log.error('Missing x-internal-api-secret header.');
        res.status(204).end();
        return;
    }
    if (req.headers['x-internal-api-secret'] !== config.INTERNAL_API_SECRET) {
        req.log.error('Invalid internal API Secret Key.');
        res.status(204).end();
        return;
    }

    for (const event of req.body.events) {
        switch (event.transmissionType) {
            case 'unicast': {
                sseService.unicastEvent(event.targetId, {
                    event: event.eventName,
                    data: event.payload,
                    id: uuidv4(),
                });
                break;
            }
            case 'multicast': {
                sseService.multicastEventToRoles(event.targetRoles, {
                    event: event.eventName,
                    data: event.payload,
                    id: uuidv4(),
                });
                break;
            }
            case 'broadcast': {
                sseService.broadcastEvent({
                    event: event.eventName,
                    data: event.payload,
                    id: uuidv4(),
                });
                break;
            }
        }
    }

    res.status(204).end();
};
