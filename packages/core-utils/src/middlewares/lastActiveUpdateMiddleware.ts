import { config } from '../config/index.js';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import type { Request, Response, NextFunction } from 'express';
import type { UserActivityPayload } from '../types/activity.types.js';

const sqsClient = new SQSClient({
    region: config.AWS_REGION,
});

export async function lastActiveUpdateMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> {
    next();

    if (!req.user) {
        req.log.warn('User not authenticated. Last active time not updated.');
        return;
    }

    const message = new SendMessageCommand({
        QueueUrl: config.SQS_USER_ACTIVITY_QUEUE_URL,
        MessageBody: JSON.stringify({
            userId: req.user.id,
            timestamp: new Date(),
        } satisfies UserActivityPayload),
    });

    try {
        await sqsClient.send(message);
        req.log.trace('User activity ping recorded.');
    } catch (error: unknown) {
        req.log.error(
            { error, userId: req.user.id },
            'Failed to send user activity ping to SQS.'
        );
    }
}
