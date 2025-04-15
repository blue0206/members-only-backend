import { config } from '../config/index.js';
import { logger } from '../logger.js';
import jwt from 'jsonwebtoken';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import { UnauthorizedError } from '../errors/customErrors.js';
import jwtErrorHandler from '../utils/jwtErrorHandler.js';
import { AccessTokenPayloadSchema } from '../../features/auth/auth.types.js';
import type { AccessTokenPayload } from '../../features/auth/auth.types.js';
import type { ApiErrorPayload } from '@blue0206/members-only-shared-types';
import type { Request, Response, NextFunction } from 'express';

export default function accessTokenVerification(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Get access token from authorization header.
    const accessToken = req.headers.authorization?.split(' ')[1];

    // Verify access token and pass the token payload the request for further access
    // of user details in protected routes.
    try {
        req.user = jwtErrorHandler((): AccessTokenPayload => {
            // Throw error if token is missing. Handled in catch statement.
            if (!accessToken) {
                throw new UnauthorizedError(
                    'Missing access token.',
                    ErrorCodes.AUTHENTICATION_REQUIRED
                );
            }
            // Decode token and populate user details in request.
            const decodedToken = jwt.verify(accessToken, config.ACCESS_TOKEN_SECRET);

            // Parse the decoded token against the defined zod schema. This approach
            // is more type safe and asserts consistency in payloads across signing and verification.
            const parsedToken = AccessTokenPayloadSchema.parse(decodedToken);

            // Return correctly typed parsed token.
            return parsedToken;
        });

        // Log success
        logger.debug(
            {
                username: req.user.username,
                role: req.user.role,
                id: req.user.id,
            },
            'Token verification successful.'
        );

        // Token verified, forward the request.
        next();
    } catch (error: unknown) {
        // Log error and directly send response for unauthorized errors.
        // This indicates that verification has failed.
        if (error instanceof UnauthorizedError) {
            // Log error.
            logger.warn(
                {
                    errorCode: error.code,
                    errorMessage: error.message,
                    requestId: req.requestId,
                    url: req.url,
                    method: req.method,
                    ip: req.ip,
                },
                `Access token validation failed: ${error.code}`
            );
            // Prepare error payload as per API contract.
            const ErrorPayload: ApiErrorPayload = {
                message: error.message,
                code: error.code,
                statusCode: 401,
            };
            // Send error response.
            res.status(401).json(ErrorPayload);
        }
        // Forward to error middleware if error not instance of UnauthorizedError
        next(error);
    }
}
