import { prisma } from '../db/prisma.js';
import { logger } from '../logger.js';
import prismaErrorHandler from '../utils/prismaErrorHandler.js';

export const userActivityPing = new Map<number, number>();

export default async function batchUpdateLastActive(): Promise<void> {
    if (userActivityPing.size === 0) {
        logger.info('No pending user activity pings.');
        return;
    }

    logger.info(
        `Running batch update for ${userActivityPing.size.toString()} users.`
    );

    const userActivityPingList = [...userActivityPing];
    // We clear the map in advance to avoid concurrent access.
    userActivityPing.clear();

    const updateBatch = userActivityPingList.map(([userId, lastPingTimestamp]) =>
        prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                lastActive: new Date(lastPingTimestamp),
            },
        })
    );

    try {
        await prismaErrorHandler(async () => {
            return await prisma.$transaction(updateBatch);
        }, logger);
        logger.info(
            `Successfully flushed lastActive data for ${updateBatch.length.toString()} users.`
        );
    } catch (error: unknown) {
        logger.error(
            { batchError: error },
            'Error encountered during batch flush of user activity pings.'
        );
    }
}
