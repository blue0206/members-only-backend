import cron from 'node-cron';
import prismaErrorHandler from '../utils/prismaErrorHandler.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../logger.js';

async function clearExpiredTokens(): Promise<void> {
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
        });
        logger.info('Expired tokens cleared in scheduled job.');
    } catch (error: unknown) {
        logger.error(
            { error },
            'Error encountered in scheduled job while clearing expired tokens'
        );
    }
}

export const clearExpiredRefreshTokensTask = cron.schedule(
    '0 0 * * *',
    clearExpiredTokens,
    {
        name: 'Clear_Expired_Refresh_Tokens',
    }
);
