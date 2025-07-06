import jwt from 'jsonwebtoken';
import jwtErrorHandler from '../utils/jwtErrorHandler.js';
import prismaErrorHandler from '../utils/prismaErrorHandler.js';
import { UnauthorizedError } from '../errors/customErrors.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import { RefreshTokenPayloadSchema } from '..//auth/auth.types.js';
import { config } from '../config/index.js';
import { prisma } from '@members-only/database';
import type { RefreshTokenPayload } from '../auth/auth.types.js';
import type { Request, Response, NextFunction } from 'express';

export default function tokenRotationCleanupMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    let isConcluded = false;

    const refreshToken: string | undefined = req.cookies.refreshToken as
        | string
        | undefined;
    if (!refreshToken) {
        throw new UnauthorizedError(
            'Missing refresh token.',
            ErrorCodes.MISSING_REFRESH_TOKEN
        );
    }

    const decodedRefreshToken: RefreshTokenPayload = jwtErrorHandler(
        (): RefreshTokenPayload => {
            const decodedToken = jwt.verify(
                refreshToken,
                config.REFRESH_TOKEN_SECRET
            );
            const parsedToken: RefreshTokenPayload =
                RefreshTokenPayloadSchema.parse(decodedToken);

            return parsedToken;
        },
        req.log
    );

    const cleanup = (): void => {
        res.off('finish', onResFinish);
        req.off('aborted', onReqAborted);
        req.off('close', onReqClose);
    };

    // Called when response has been successfully sent.
    const onResFinish = (): void => {
        if (isConcluded) return;
        isConcluded = true;

        req.log.info(
            'Response finished. Removing old, rotated-out refresh token from DB.'
        );

        // We finish the refresh token rotation on successful response
        // by deleting old refresh token from DB.
        prismaErrorHandler(() => {
            return prisma.refreshToken.delete({
                where: {
                    jwtId: decodedRefreshToken.jti,
                    userId: decodedRefreshToken.id,
                },
            });
        }, req.log)
            .then(() => {
                req.log.info('Rotated-out refresh token deleted successfully.');
            })
            .catch((error: unknown) => {
                req.log.error(
                    { error },
                    'Error deleting rotated-out refresh token.'
                );
            });

        cleanup();
    };

    // Called when request is aborted.
    const onReqAborted = (): void => {
        if (isConcluded) return;
        isConcluded = true;

        req.log.info('Request aborted. Removing orphaned refresh tokens from DB.');

        // On abort, the client does not receive the new token.
        // We delete these new, orphaned tokens from the DB.
        prismaErrorHandler(() => {
            return prisma.refreshToken.deleteMany({
                where: {
                    succeedsJwtId: decodedRefreshToken.jti,
                },
            });
        }, req.log)
            .then(() => {
                req.log.info('Orphaned refresh tokens deleted successfully.');
            })
            .catch((error: unknown) => {
                req.log.error({ error }, 'Error deleting orphaned refresh tokens.');
            });

        cleanup();
    };

    // Called when response is completed, or the underlying connection was terminated prematurely.
    // This serves as a defensive check in case either of the other two listeners fail.
    const onReqClose = (): void => {
        if (isConcluded) return;
        isConcluded = true;

        if (!res.writableEnded) {
            // Connection terminated prematurely, possible abort.
            req.log.info(
                'Connection CLOSED prematurely. Possible abort. Removing orphaned refresh tokens from DB.'
            );

            prismaErrorHandler(() => {
                return prisma.refreshToken.deleteMany({
                    where: {
                        succeedsJwtId: decodedRefreshToken.jti,
                    },
                });
            }, req.log)
                .then(() => {
                    req.log.info('Orphaned refresh tokens deleted successfully.');
                })
                .catch((error: unknown) => {
                    req.log.error(
                        { error },
                        'Error deleting orphaned refresh tokens.'
                    );
                });
        } else {
            // Response was completed, so we treat this as success.
            req.log.info(
                'Response completed. Treating as success. Removing old, rotated-out refresh token from DB.'
            );
            prismaErrorHandler(() => {
                return prisma.refreshToken.delete({
                    where: {
                        jwtId: decodedRefreshToken.jti,
                        userId: decodedRefreshToken.id,
                    },
                });
            }, req.log)
                .then(() => {
                    req.log.info('Rotated-out refresh token deleted successfully.');
                })
                .catch((error: unknown) => {
                    req.log.error(
                        { error },
                        'Error deleting rotated-out refresh token.'
                    );
                });
        }
        cleanup();
    };

    res.on('finish', onResFinish);
    req.on('aborted', onReqAborted);
    req.on('close', onReqClose);

    next();
}
