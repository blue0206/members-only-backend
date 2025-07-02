import { config } from '../config/index.js';
import jwt from 'jsonwebtoken';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import { UnauthorizedError } from '../errors/customErrors.js';
import jwtErrorHandler from '../utils/jwtErrorHandler.js';
import { AccessTokenPayloadSchema } from '../../features/auth/auth.types.js';
import type { AccessTokenPayload } from '../../features/auth/auth.types.js';
import type {
    ApiErrorPayload,
    ApiResponseError,
} from '@blue0206/members-only-shared-types';
import type { Request, Response, NextFunction } from 'express';

export default function accessTokenVerification(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const accessToken = req.headers.authorization?.split(' ')[1];

    // Verify access token and pass the token payload the request for further access
    // of user details in protected routes.
    try {
        req.user = jwtErrorHandler((): AccessTokenPayload => {
            if (!accessToken) {
                throw new UnauthorizedError(
                    'Missing access token.',
                    ErrorCodes.AUTHENTICATION_REQUIRED
                );
            }
            const decodedToken = jwt.verify(accessToken, config.ACCESS_TOKEN_SECRET);

            // Parse the decoded token against the defined zod schema. This approach
            // is more type safe and asserts consistency in payloads across signing and verification.
            const parsedToken = AccessTokenPayloadSchema.parse(decodedToken);

            return parsedToken;
        });

        // Create a new child logger on existing child logger and attach user details.
        // This removes the need to pass user details in every logging statement.
        req.log = req.log.child({
            userId: req.user.id,
            username: req.user.username,
            userRole: req.user.role,
        });

        req.log.debug('Token verification successful.');

        // Token verified, forward the request.
        next();
    } catch (error: unknown) {
        // If the error occurs on logout route, we just log the error but pass the
        // request forward so that the cookies are cleared by controller and the
        // session data is revoked by service.
        if (req.url === '/logout') {
            req.log.warn(
                { error },
                'Error verifying access token in logout route. Passing request forward for clearing cookies and revoking session.'
            );
            next();
            return;
        }

        // Log error and directly send response for unauthorized errors.
        // This indicates that verification has failed.
        if (error instanceof UnauthorizedError) {
            // No matter the error code received from jwtErrorHandler,
            // we only send EXPIRED_TOKEN error code in response for access tokens.
            // This is to prevent erroneous session expiry on frontend due to errors
            // other than EXPIRED_TOKEN error (e.g. INVALID_TOKEN error).
            // This is because as long as the user has legit refresh token, their
            // session should not be expired.
            req.log.warn(
                {
                    actualErrorCode: error.code,
                    sentErrorCode: ErrorCodes.EXPIRED_TOKEN,
                    errorMessage: error.message,
                    url: req.url,
                    method: req.method,
                    ip: req.ip,
                },
                `Access token validation failed: ${error.code}`
            );

            const ErrorPayload: ApiErrorPayload = {
                message: error.message,
                code: ErrorCodes.EXPIRED_TOKEN,
                statusCode: 401,
            };
            const ErrorResponse: ApiResponseError = {
                success: false,
                errorPayload: ErrorPayload,
                requestId: req.requestId,
            };

            res.status(401).json(ErrorResponse);
            return;
        }
        // Forward to error middleware.
        next(error);
    }
}
