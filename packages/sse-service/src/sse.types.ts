import { z } from 'zod';
import {
    MessageEventPayloadSchema,
    MultiEventPayloadSchema,
    UserEventPayloadSchema,
} from '@blue0206/members-only-shared-types/dtos/event.dto';
import { SseEventNames } from '@blue0206/members-only-shared-types/api/event-names';
import type { EventRequestQueryDto } from '@blue0206/members-only-shared-types/dtos/event.dto';
import type { Response, Request } from 'express';
import type { Role } from '@blue0206/members-only-shared-types/enums/roles.enum';
import type { Logger } from '@members-only/core-utils/logger';

export interface SseClient {
    id: string; // Client ID
    userId: number;
    userRole: Role;
    res: Response;
    log: Logger;
}

export interface SseClientAddParamsType {
    userId: number;
    userRole: Role;
    res: Response;
    req: Request<unknown, unknown, unknown, EventRequestQueryDto>;
}

export const EventBodySchema = z.discriminatedUnion('event', [
    z.object({
        event: z.literal(SseEventNames.MESSAGE_EVENT),
        data: MessageEventPayloadSchema,
        id: z.string().uuid(),
    }),
    z.object({
        event: z.literal(SseEventNames.USER_EVENT),
        data: UserEventPayloadSchema,
        id: z.string().uuid(),
    }),
    z.object({
        event: z.literal(SseEventNames.MULTI_EVENT),
        data: MultiEventPayloadSchema,
        id: z.string().uuid(),
    }),
]);
export type EventBody = z.infer<typeof EventBodySchema>;
