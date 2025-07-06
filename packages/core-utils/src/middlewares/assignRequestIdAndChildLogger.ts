import { v4 as uuidv4 } from 'uuid';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';

// This middleware assigns a uuidv4 to every request and
// creates a child logger for every request and passes it forward.
export function assignRequestIdAndChildLogger(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    req.requestId = uuidv4();
    req.log = logger.child({ requestId: req.requestId });
    res.setHeader('x-request-id', req.requestId);
    next();
}
