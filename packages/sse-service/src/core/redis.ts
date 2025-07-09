import { config } from '@members-only/core-utils/env';
import { logger } from '@members-only/core-utils/logger';
import IORedis from 'ioredis';
import type { Redis, RedisOptions } from 'ioredis';

const redisOptions: RedisOptions = {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD,
    tls: {},
    lazyConnect: true,
    showFriendlyErrorStack: config.NODE_ENV === 'development',
    maxRetriesPerRequest: 2,
};

export function createRedisClient(): Redis {
    const client: Redis = new IORedis.default(redisOptions);

    client.on('error', (error: unknown) => {
        logger.error({ error }, 'Redis client error.');
    });

    return client;
}

export const publisher = createRedisClient();
