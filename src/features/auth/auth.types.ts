import type { Role } from '@blue0206/members-only-shared-types';
import type { User } from '../../core/db/prisma-client/client.js';
import type { JwtPayload } from 'jsonwebtoken';

export interface RegisterServiceReturnType extends Omit<User, 'password'> {
    accessToken: string;
    refreshToken: string;
}

export interface LoginServiceReturnType extends User {
    accessToken: string;
    refreshToken: string;
}

export interface AccessTokenPayload extends JwtPayload {
    id: number;
    username: string;
    role: Role;
}

export interface RefreshTokenPayload extends JwtPayload {
    id: number;
}
