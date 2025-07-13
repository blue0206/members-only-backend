export function getEnv() {
    const env: Record<string, string> = {
        NODE_ENV: process.env.NODE_ENV ?? '',
        PORT: process.env.PORT ?? '',
        DATABASE_URL: process.env.DATABASE_URL ?? '',
        ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET ?? '',
        REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET ?? '',
        ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY ?? '',
        REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY ?? '',
        COOKIE_DOMAIN: process.env.COOKIE_DOMAIN ?? '',
        SALT_ROUNDS: process.env.SALT_ROUNDS ?? '',
        LOG_LEVEL: process.env.LOG_LEVEL ?? '',
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? '',
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? '',
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? '',
        MEMBER_ROLE_SECRET_KEY: process.env.MEMBER_ROLE_SECRET_KEY ?? '',
        INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET ?? '',
        DISPATCH_EVENT_API_URL: process.env.DISPATCH_EVENT_API_URL ?? '',
        SQS_AWS_REGION: process.env.SQS_AWS_REGION ?? '',
        SQS_USER_ACTIVITY_QUEUE_URL: process.env.SQS_USER_ACTIVITY_QUEUE_URL ?? '',
        REDIS_HOST: process.env.REDIS_HOST ?? '',
        REDIS_PORT: process.env.REDIS_PORT ?? '',
        REDIS_PASSWORD: process.env.REDIS_PASSWORD ?? '',
    };

    if (Object.values(env).some((val) => val === '')) {
        console.log('Environment variables not set.');
        process.exit(1);
    }

    return env;
}
