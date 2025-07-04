import type { Response, Request } from 'express';
import type {
    EventRequestQueryDto,
    Role,
} from '@blue0206/members-only-shared-types';
import type { Logger } from 'pino';

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
