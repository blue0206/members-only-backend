import { ForbiddenError } from '../errors/customErrors.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types/api/error-codes';
import type { Request, Response, NextFunction } from 'express';

// This middleware is used to verify CSRF tokens, a method
// known as 'Double Submit' method where two CSRF tokens are
// sent: one in the header set by the client, and the other
// in the cookie set by the server.
// If any of these are missing or don't match, the request is blocked
// on the grounds of probable CSRF attack.
// This middleware is assigned on all state-changing routes.
export function csrfVerification(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    // Check if CSRF token is present in header (to be sent by client.)
    if (!req.headers['x-csrf-token']) {
        throw new ForbiddenError(
            'CSRF token missing.',
            ErrorCodes.MISSING_CSRF_HEADER
        );
    }
    // Check if CSRF token is present in header (provided from the server.)
    if (!req.cookies['csrf-token']) {
        throw new ForbiddenError(
            'CSRF token missing.',
            ErrorCodes.MISSING_CSRF_COOKIE
        );
    }
    // Check if CSRF tokens match
    if (req.headers['x-csrf-token'] !== req.cookies['csrf-token']) {
        throw new ForbiddenError(
            'CSRF token mismatch.',
            ErrorCodes.CSRF_TOKEN_MISMATCH
        );
    }

    req.log.debug('CSRF token verification successful.');
    next();
}
