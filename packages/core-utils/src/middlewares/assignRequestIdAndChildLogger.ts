import { v4 as uuidv4 } from 'uuid';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';

// This middleware assigns a uuidv4 to every request and
// creates a child logger for every request and passes it forward.
export const assignRequestIdAndChildLogger =
    (service: 'auth-service' | 'user-service' | 'message-service' | 'sse-service') =>
    (req: Request, res: Response, next: NextFunction): void => {
        req.requestId = uuidv4();
        req.log = logger.child({
            requestId: req.requestId,
            service,
        });
        req.log.info(
            { method: req.method, path: req.originalUrl },
            'Incoming request.'
        );
        res.setHeader('x-request-id', req.requestId);
        next();
    };
