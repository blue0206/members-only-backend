import { logger } from '../logger.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import { InternalServerError, UnauthorizedError } from '../errors/customErrors.js';
import * as jwtLib from 'jsonwebtoken';
import { ZodError } from 'zod';
import type {
    AccessTokenPayload,
    RefreshTokenPayload,
} from '../../features/auth/auth.types.js';

// Direct importing from jwtLib throws error because
// jsonwebtoken uses CommonJS, hence we destructure it.
const { JsonWebTokenError } = jwtLib;

export default function jwtErrorHandler<
    TokenType extends AccessTokenPayload | RefreshTokenPayload,
>(verifyJwt: () => TokenType): TokenType {
    try {
        const decodedToken: TokenType = verifyJwt();
        return decodedToken;
    } catch (error: unknown) {
        // If error is an instance of JWT-Error, send appropriate error.
        if (error instanceof JsonWebTokenError) {
            if (error.name === 'TokenExpiredError') {
                throw new UnauthorizedError(
                    'Access token has expired.',
                    ErrorCodes.EXPIRED_TOKEN
                );
            } else if (error.name === 'JsonWebTokenError') {
                throw new UnauthorizedError(
                    'Token verification failed.',
                    ErrorCodes.INVALID_TOKEN
                );
            }
        } else if (error instanceof ZodError) {
            // This will be thrown when decoded token parsing
            // against Zod schema fails.
            logger.error(
                { error: error.flatten() },
                'JWT Payload validation failed.'
            );
            throw new InternalServerError('Internal server error processing token.');
        }

        // Send generic error if error not instance of JWT.
        throw new UnauthorizedError(
            'Failed to authenticate token.',
            ErrorCodes.INVALID_TOKEN
        );
    }
}
