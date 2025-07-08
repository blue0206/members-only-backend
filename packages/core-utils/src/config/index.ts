import { z } from 'zod';
import ms from 'ms';
import type { StringValue } from 'ms';

const EnvironmentSchema = z.object({
    // node
    NODE_ENV: z.enum(['development', 'production']).default('development'),
    // server
    PORT: z.coerce.number().int().positive().default(8000),
    // cors
    CORS_ORIGIN: z.string().min(1, { message: 'CORS origin is missing.' }),
    // db
    DATABASE_URL: z.string().min(1, { message: 'DATABASE URL is missing.' }),
    // jsonwebtoken
    ACCESS_TOKEN_SECRET: z
        .string()
        .min(1, { message: 'Access Token secret is missing.' }),
    ACCESS_TOKEN_EXPIRY: z
        .string()
        .min(1, { message: 'Access Token expiry is missing.' })
        .refine((value) => value && typeof ms(value as StringValue) === 'number')
        .default('15m'),
    REFRESH_TOKEN_SECRET: z
        .string()
        .min(1, { message: 'Refresh Token secret is missing.' }),
    REFRESH_TOKEN_EXPIRY: z
        .string()
        .min(1, { message: 'Refresh Token expiry is missing.' })
        .refine((value) => value && typeof ms(value as StringValue) === 'number')
        .default('7d'),
    // cookie domain
    COOKIE_DOMAIN: z.string().min(1, { message: 'Cookie domain is missing.' }),
    // bcrypt
    SALT_ROUNDS: z.coerce.number().int().positive().default(10),
    // pino logger
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).optional(),
    // cloudinary
    CLOUDINARY_CLOUD_NAME: z.string(),
    CLOUDINARY_API_KEY: z.string(),
    CLOUDINARY_API_SECRET: z.string(),
    // member role access secret key
    MEMBER_ROLE_SECRET_KEY: z.string(),
    // Internal API Secret and URL
    INTERNAL_API_SECRET: z
        .string()
        .min(1, { message: 'Internal API secret is missing.' }),
    DISPATCH_EVENT_API_URL: z
        .string()
        .url({ message: 'Invalid API URL.' })
        .min(1, { message: 'API URL is missing.' }),
    // AWS
    AWS_REGION: z.string().min(1, { message: 'AWS region is missing.' }),
    SQS_USER_ACTIVITY_QUEUE_URL: z
        .string()
        .min(1, { message: 'SQS activity queue URL is missing.' }),
});

const parsedEnv = EnvironmentSchema.safeParse(process.env);
if (!parsedEnv.success) {
    console.error(
        'Invalid environment variables.',
        JSON.stringify(parsedEnv.error.flatten().fieldErrors, null, 2)
    );
    process.exit(1);
}

export const config = parsedEnv.data;
export type EnvironmentConfig = z.infer<typeof EnvironmentSchema>;
