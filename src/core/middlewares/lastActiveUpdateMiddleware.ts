import { logger } from '../logger.js';
import { userActivityPing } from '../scheduler/batchUpdateLastActive.js';
import type { Request, Response, NextFunction } from 'express';

export default function lastActiveUpdateMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    next();

    if (!req.user) {
        logger.warn('User not authenticated. Last active time not updated.');
        return;
    }

    userActivityPing.set(req.user.id, Date.now());
    logger.trace({ userId: req.user.id }, 'User activity ping recorded.');
}
