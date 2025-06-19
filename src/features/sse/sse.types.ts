import type { Response, Request } from 'express';
import type { Role } from '@blue0206/members-only-shared-types';

export interface SseClient {
    id: string; // Client ID
    userId: number;
    userRole: Role;
    res: Response;
}

export interface SseClientAddParamsType {
    userId: number;
    userRole: Role;
    res: Response;
    req: Request;
}
