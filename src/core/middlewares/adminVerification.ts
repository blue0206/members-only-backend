import { ForbiddenError } from '../errors/customErrors.js';
import { ErrorCodes, Role } from '@blue0206/members-only-shared-types';
import type { Request, Response, NextFunction } from 'express';

export default function adminVerification(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    // Get user payload from req.user (populated by access token verification middleware).
    const userPayload = req.user;

    // If the user is Admin, grant access by passing request forward.
    if (userPayload?.role === Role.ADMIN) {
        next();
    }

    // The user is not Admin, throw error.
    throw new ForbiddenError('Admin privileges are required.', ErrorCodes.FORBIDDEN);
}
