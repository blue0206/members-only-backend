import { prisma } from '@members-only/database';
import { logger } from '../logger.js';
import { prismaErrorHandler } from '../utils/prismaErrorHandler.js';

export default async function clearExpiredTokens(): Promise<void> {
    const now = new Date();

    logger.info(`Running refresh token cleanup at ${now.toISOString()}....`);

    try {
        await prismaErrorHandler(async () => {
            return await prisma.refreshToken.deleteMany({
                where: {
                    expiresAt: {
                        lte: now,
                    },
                },
            });
        }, logger);
        logger.info('Expired tokens cleared in scheduled job.');
    } catch (error: unknown) {
        logger.error(
            { error },
            'Error encountered in scheduled job while clearing expired tokens'
        );
    }
}
