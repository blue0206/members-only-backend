import {
    createRedisClient,
    getBroadcastChannelName,
    getRoleChannelName,
    getUserChannelName,
} from './redis.js';
import { EventBodySchema } from '../sse.types.js';
import { logger } from '@members-only/core-utils/logger';
import { clients, sseService } from '../sse.service.js';
import type { Redis } from 'ioredis';
import type { Role } from '@blue0206/members-only-shared-types/enums/roles.enum';

class SubscriberService {
    private readonly subscriber: Redis;
    private subscribedChannels = new Set<string>();

    constructor() {
        // Create redis client and setup message listener.
        this.subscriber = createRedisClient();
        this.messageListener();

        logger.info('Subscriber service initialized.');
    }

    // Subscribes to a list of channels if not already subscribed.
    async subscribeToChannels(...channels: string[]): Promise<void> {
        for (const channel of channels) {
            if (!this.subscribedChannels.has(channel)) {
                await this.subscriber.subscribe(channel);
                this.subscribedChannels.add(channel);
                logger.info({ channel }, 'Subscribed to Redis channel.');
            }
        }
    }

    // Checks if channels for a disconnecting client are still needed by other clients
    // and unsubscribes them if not.
    async unsubscribeFromChannels(
        clientId: string,
        userId: number,
        userRole: Role
    ): Promise<void> {
        // Verify if there are other clients with same userId or role.
        let userIdChannelNeeded = false;
        let roleChannelNeeded = false;

        for (const client of clients.values()) {
            if (client.id === clientId) continue;
            if (client.userId === userId) userIdChannelNeeded = true;
            if (client.userRole === userRole) roleChannelNeeded = true;
            if (userIdChannelNeeded && roleChannelNeeded) break;
        }

        if (!userIdChannelNeeded) {
            await this.subscriber.unsubscribe(getUserChannelName(userId));
            this.subscribedChannels.delete(getUserChannelName(userId));
            logger.info(
                { channel: getUserChannelName(userId) },
                'Unsubscribed from Redis channel.'
            );
        }
        if (!roleChannelNeeded) {
            await this.subscriber.unsubscribe(getRoleChannelName(userRole));
            this.subscribedChannels.delete(getRoleChannelName(userRole));
            logger.info(
                { channel: getRoleChannelName(userRole) },
                'Unsubscribed from Redis channel.'
            );
        }
        if (clients.size === 0) {
            await this.subscriber.unsubscribe(getBroadcastChannelName());
            this.subscribedChannels.delete(getBroadcastChannelName());
            logger.info(
                { channel: getBroadcastChannelName() },
                'Unsubscribed from Redis channel.'
            );
        }
    }

    // Disconnects from Redis, to be used in graceful shutdown.
    async disconnect(): Promise<void> {
        await this.subscriber.quit();
    }

    // The single, centralized message handler for this server instance.
    // It receives all messages from all subscribed channels.
    private messageListener(): void {
        this.subscriber.on('message', (channel, message) => {
            try {
                const data: unknown = JSON.parse(message);
                logger.info({ channel }, 'Received message from Redis.');

                const validatedData = EventBodySchema.safeParse(data);
                if (!validatedData.success) {
                    logger.error(
                        { error: validatedData.error.flatten(), channel },
                        'Invalid payload received from Redis subscribed channel.'
                    );
                    return;
                }

                const eventBody = validatedData.data;

                if (channel === getBroadcastChannelName()) {
                    // Broadcast to all clients.
                    sseService.broadcastEvent(eventBody);
                } else if (channel.startsWith('channel:role:')) {
                    // Multicast to all clients with same role.
                    const role = channel.split(':')[2] as Role;
                    sseService.multicastEventToRole(role, eventBody);
                } else if (channel.startsWith('channel:user:')) {
                    // Unicast to specific client.
                    const userId = +channel.split(':')[2];
                    sseService.unicastEvent(userId, eventBody);
                } else {
                    logger.warn(
                        { channel, message },
                        'Message received from unknown channel.'
                    );
                }
            } catch (error: unknown) {
                logger.error(
                    { error, channel, message },
                    'Error parsing message from Redis.'
                );
            }
        });
    }
}

export const subscriberService = new SubscriberService();
