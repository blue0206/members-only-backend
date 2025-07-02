import { pinoHttp } from 'pino-http';
import { logger } from '../logger.js';
import type { Request } from 'express';

export const loggerMiddleware = pinoHttp({
    logger,
    customProps: (req: Request) => ({
        requestId: req.requestId,
    }),
    serializers: {
        // Redact authorization header (access token) and cookie (refresh token) for security reasons.
        req: (req: Request) => {
            req.headers = {
                ...req.headers,
                authorization: req.headers.authorization ? '[REDACTED]' : undefined,
                cookie: req.headers.cookie ? '[REDACTED]' : undefined,
                'x-csrf-token': req.headers['x-csrf-token']
                    ? '[REDACTED]'
                    : undefined,
            };
            return req;
        },
    },
});
