import { pinoHttp } from 'pino-http';
import { logger } from '../logger.js';
import type { Request, Response } from 'express';

export const loggerMiddleware = pinoHttp({
    logger,
    customProps: (req: Request, _res: Response) => ({
        requestId: req.requestId ?? '',
    }),
    serializers: {
        // Don't log authorization header (access token) and cookie (refresh token) for security reasons.
        req: (req: Request) => {
            req.headers = {
                ...req.headers,
                authorization: req.headers.authorization ? '[REDACTED]' : undefined,
                cookie: req.headers.cookie ? '[REDACTED]' : undefined,
            };
            return req;
        },
    },
});
