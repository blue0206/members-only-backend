import { config } from '../config/index.js';
import { logger } from '../logger.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from '../../features/auth/auth.types.js';
import type {
    ApiErrorCode,
    ApiErrorPayload,
} from '@blue0206/members-only-shared-types';

export default function accessTokenVerification(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Function to log the error and directly send response.
    const sendUnauthorizedError = (code: ApiErrorCode, message: string): void => {
        // Log error.
        logger.warn(
            {
                errorCode: code,
                errorMessage: message,
                requestId: req.requestId,
                url: req.url,
                method: req.method,
                ip: req.ip,
            },
            `Access token validation failed: ${code}`
        );

        // Prepare error payload as per API contract.
        const ErrorPayload: ApiErrorPayload = {
            message,
            code,
            statusCode: 401,
        };
        // Send error response.
        res.status(401).json(ErrorPayload);
    };

    // Get access token from authorization header.
    const accessToken = req.headers.authorization?.split(' ')[1];

    // Throw error if token is missing.
    if (!accessToken) {
        sendUnauthorizedError(
            ErrorCodes.AUTHENTICATION_REQUIRED,
            'Missing access token.'
        );
        // Explicit return to assert that accessToken is not undefined.
        return;
    }

    // Verify access token and pass the token payload as user to the request for further access.
    try {
        const decodedToken = jwt.verify(accessToken, config.ACCESS_TOKEN_SECRET);
        req.user = decodedToken as JwtPayload;

        // Log success
        logger.debug(
            { username: req.user.username, role: req.user.role, id: req.user.id },
            'Token verification successful.'
        );

        // Token verified, forward the request.
        next();
    } catch (error: unknown) {
        // If error is an instance of JWT-Error, send appropriate error.
        if ((error as jwt.JsonWebTokenError).name === 'TokenExpiredError') {
            sendUnauthorizedError(
                ErrorCodes.EXPIRED_TOKEN,
                'Access token has expired.'
            );
        } else if ((error as jwt.JsonWebTokenError).name === 'JsonWebTokenError') {
            sendUnauthorizedError(
                ErrorCodes.INVALID_TOKEN,
                'Token verification failed.'
            );
        }
        // Send generic error if error not instance of JWT
        sendUnauthorizedError(
            ErrorCodes.INVALID_TOKEN,
            'Failed to authenticate token.'
        );
    }
}
