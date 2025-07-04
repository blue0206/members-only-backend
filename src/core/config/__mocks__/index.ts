export const config = {
    NODE_ENV: 'development',
    PORT: 8000,
    DATABASE_URL: 'postgresql://user:password@localhost:5432/testdb',
    RUN_SEED: true,
    SEED_ADMIN_PASSWORD: 'Test@admin1234',
    SEED_MEMBER_PASSWORD: 'Test@member1234',
    SEED_USER_PASSWORD: 'Test@user1234',
    ACCESS_TOKEN_SECRET: 'test-access-token-secret',
    REFRESH_TOKEN_SECRET: 'test-refresh-token-secret',
    ACCESS_TOKEN_EXPIRY: '2s',
    REFRESH_TOKEN_EXPIRY: '5s',
    SALT_ROUNDS: 10,
    LOG_LEVEL: 'debug',
    CLOUDINARY_CLOUD_NAME: 'test-cloudinary-cloud-name',
    CLOUDINARY_API_KEY: 'test-cloudinary-api-key',
    CLOUDINARY_API_SECRET: 'test-cloudinary-api-secret',
    MEMBER_ROLE_SECRET_KEY: 'test-member-role-secret-key',
};
