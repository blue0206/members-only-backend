import { logger } from '../logger.js';
import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (
    err: Error,
    req: Request,
    _res: Response,
    _next: NextFunction
): void => {
    logger.error(
        {
            err,
            requestId: req.requestId,
            url: req.url,
            method: req.method,
            ip: req.ip,
        },
        err.message || 'An error occurred in the error middleware.'
    );
};
