import { ForbiddenError } from '../errors/customErrors.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types/api/error-codes';
import { Role } from '@blue0206/members-only-shared-types/enums/roles.enum';
import type { Request, Response, NextFunction } from 'express';

export function memberVerification(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    // Get user payload from req.user (populated by access token verification middleware).
    const userPayload = req.user;

    if (userPayload && userPayload.role === Role.USER) {
        throw new ForbiddenError(
            'Member or Admin privileges are required.',
            ErrorCodes.FORBIDDEN
        );
    }

    // The user is a Member or Admin, grant access by passing request forward.
    req.log.debug('Member or Admin privileges verified successfully.');
    next();
}
