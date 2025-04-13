import { UnauthorizedError } from '../errors/customErrors.js';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import type { JwtPayload } from '../../features/auth/auth.types.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import { logger } from '../logger.js';

export default function accessTokenVerification(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    // Get access token from authorization header.
    const accessToken = req.headers.authorization?.split(' ')[1];

    // Throw error id token is missing.
    if (!accessToken) {
        throw new UnauthorizedError(
            'Missing access token.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    // Verify access token and pass the payload as user to the request for further access.
    try {
        const decodedToken = jwt.verify(accessToken, config.ACCESS_TOKEN_SECRET);
        req.user = decodedToken as JwtPayload;
        next();
    } catch (error: unknown) {
        logger.error({ err: error }, 'Token verification failed.');
        if ((error as jwt.JsonWebTokenError).name === 'TokenExpiredError') {
            throw new UnauthorizedError(
                'Access token has expired.',
                ErrorCodes.EXPIRED_TOKEN
            );
        } else if ((error as jwt.JsonWebTokenError).name === 'JsonWebTokenError') {
            throw new UnauthorizedError(
                'Token verification failed.',
                ErrorCodes.INVALID_TOKEN
            );
        }
        throw new UnauthorizedError(
            'Failed to authenticate token.',
            ErrorCodes.INVALID_TOKEN
        );
    }
}
