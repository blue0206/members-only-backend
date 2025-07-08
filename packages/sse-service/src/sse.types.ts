import type { Response, Request } from 'express';
import type { EventRequestQueryDto } from '@blue0206/members-only-shared-types/dtos/event.dto';
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
