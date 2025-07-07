import { prisma } from '@members-only/database';
import { logger } from '@members-only/core-utils/logger';
import type { EventBridgeEvent } from 'aws-lambda';

export const handler = async (
    event: EventBridgeEvent<never, never>
): Promise<void> => {
    const log = logger.child({ lambda: 'tokenCleanupWorker' });
    log.info(`Scheduled task started. Event source: ${event.source}`);

    try {
        const now = new Date();
        log.info({ time: now.toISOString() }, 'Deleting expired refresh tokens.');

        const { count } = await prisma.refreshToken.deleteMany({
            where: {
                expiresAt: {
                    lte: now,
                },
            },
        });

        log.info(`Cleanup successful. Deleted ${count.toString()} refresh tokens.`);
    } catch (error: unknown) {
        log.error({ error }, 'Failed to execute expired token cleanup task.');

        // Throw for EventBridge retries.
        throw error;
    }
};
