import { ForbiddenError } from '../errors/customErrors.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import type { Request, Response, NextFunction } from 'express';

// This middleware is used to verify CSRF tokens, a method
// known as 'Double Submit' method where two CSRF tokens are
// sent: one in the header set by the client, and the other
// in the cookie set by the server.
// If any of these are missing or don't match, the request is blocked
// on the grounds of probable CSRF attack.
// This middleware is assigned on all state-changing routes.
export default function csrfVerification(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    // We throw error and block the request if any of the following checks
    // fail as it raises the concern of a probable CSRF attack.

    // Check if CSRF token is present in header (to be sent by client.)
    if (!req.headers['X-CSRF-Token']) {
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
    if (req.headers['X-CSRF-Token'] !== req.cookies['csrf-token']) {
        throw new ForbiddenError(
            'CSRF token mismatch.',
            ErrorCodes.CSRF_TOKEN_MISMATCH
        );
    }
    // The checks have passed, pass on the request.
    next();
}
