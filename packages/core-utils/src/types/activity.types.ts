import { z } from 'zod';

export const UserActivityPayloadSchema = z.object({
    userId: z.coerce.number().int().positive(),
    timestamp: z.coerce.date(),
});

export type UserActivityPayload = z.infer<typeof UserActivityPayloadSchema>;
