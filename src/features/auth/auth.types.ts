import type { Role } from '@blue0206/members-only-shared-types';
import type { User } from '../../core/db/prisma-client/client.js';

export interface RegisterServiceReturnType extends Omit<User, 'password'> {
    accessToken: string;
    refreshToken: string;
}

export interface LoginServiceReturnType extends User {
    accessToken: string;
    refreshToken: string;
}

export interface JwtPayload {
    id: number;
    username: string;
    role: Role;
}
