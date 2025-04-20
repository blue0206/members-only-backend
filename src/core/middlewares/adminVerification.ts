import { ForbiddenError } from '../errors/customErrors.js';
import { ErrorCodes, Role } from '@blue0206/members-only-shared-types';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';

export default function adminVerification(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    // Get user payload from req.user (populated by access token verification middleware).
    const userPayload = req.user;

    // The user is not Admin, throw error.
    if (userPayload && userPayload.role !== Role.ADMIN) {
        throw new ForbiddenError(
            'Admin privileges are required.',
            ErrorCodes.FORBIDDEN
        );
    }

    // The user is Admin, grant access by passing request forward.
    // Log success.
    logger.debug({ userPayload }, 'Admin privileges verified successfully.');
    // Pass request forward.
    next();
}
