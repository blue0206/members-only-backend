import { logger, UserActivityPayloadSchema } from '@members-only/core-utils';
import { prisma } from '@members-only/database';
import type { UserActivityPayload } from '@members-only/core-utils';
import type { SQSEvent } from 'aws-lambda';

export const handler = async (event: SQSEvent): Promise<void> => {
    const log = logger.child({ lambda: 'userActivityWorker' });
    log.info(`Processing ${event.Records.length.toString()} user activity records.`);

    const updates: UserActivityPayload[] = [];

    // Parse and validate each JSON SQS record.
    for (const record of event.Records) {
        try {
            const payload: unknown = JSON.parse(record.body);
            const validatedPayload = UserActivityPayloadSchema.safeParse(payload);

            if (validatedPayload.success) {
                updates.push(validatedPayload.data);
            } else {
                log.warn(
                    {
                        messageBody: record.body,
                        error: validatedPayload.error.flatten(),
                    },
                    'Received malformed SQS data.'
                );
            }
        } catch (error: unknown) {
            log.warn(
                { messageBody: record.body, error },
                'Failed to parse SQS message JSON.'
            );
        }
    }

    if (updates.length === 0) {
        log.info('No valid user activity records to process.');
        return;
    }

    // De-duplicate updates; keep latest timestamp for each userId.
    const latestUpdates = new Map<number, Date>();
    for (const update of updates) {
        const existingTimestamp = latestUpdates.get(update.userId);

        if (!existingTimestamp || update.timestamp > existingTimestamp) {
            latestUpdates.set(update.userId, update.timestamp);
        }
    }

    log.info(
        `Processing ${latestUpdates.size.toString()} unique user updates after de-duplication.`
    );

    // Prepare batch of updates.
    const updateBatch = [...latestUpdates].map(([userId, timestamp]) =>
        prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                lastActive: timestamp,
            },
        })
    );

    try {
        await prisma.$transaction(updateBatch);
        log.info(
            `Successfully flushed ${updateBatch.length.toString()} user activity updates to the database.`
        );
    } catch (error: unknown) {
        log.error(
            { error },
            'Failed to process user activity updates to the database.'
        );

        // Re-throw to ensure Lambda/SQS retries on failure.
        throw error;
    }
};
