import { z } from 'zod';
import ms from 'ms';
import type { StringValue } from 'ms';

const EnvironmentSchema = z.object({
    NODE_ENV: z.enum(['development', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(8000),
    DATABASE_URL: z.string().min(1, { message: 'DATABASE URL is missing.' }),
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
    SALT_ROUNDS: z.coerce.number().int().positive().default(10),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).optional(),
    MEMBER_ROLE_SECRET_KEY: z.string(),
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
