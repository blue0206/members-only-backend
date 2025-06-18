import { Role } from '@blue0206/members-only-shared-types';
import { z } from 'zod';
import type { User, RefreshToken } from '../../core/db/prisma-client/client.js';
import type { JwtPayload } from 'jsonwebtoken';

export interface RegisterServiceReturnType extends Omit<User, 'password'> {
    accessToken: string;
    refreshToken: string;
}

export interface LoginServiceReturnType extends User {
    accessToken: string;
    refreshToken: string;
}

export interface RefreshServiceReturnType extends Omit<User, 'password'> {
    accessToken: string;
    refreshToken: string;
}

export interface GetSessionsServiceReturnType {
    sessions: Omit<RefreshToken, 'tokenHash'>[];
    currentSessionId: string;
}

// -----JWT Payload schemas and types-----

// Access Token payload schema.
export const AccessTokenPayloadSchema = z
    .object({
        id: z.number(),
        username: z.string(),
        role: z.nativeEnum(Role),
    })
    .passthrough(); // For other properties filled by jwt.verify()
type AccessTokenPayloadType = z.infer<typeof AccessTokenPayloadSchema>;

// Refresh Token payload schema.
export const RefreshTokenPayloadSchema = z.object({ id: z.number() }).passthrough();
type RefreshTokenPayloadType = z.infer<typeof RefreshTokenPayloadSchema>;

// Access Token and Refresh Token payloads interfaces, serve as types for signing
// payload and decoded token payload.
export interface AccessTokenPayload extends JwtPayload, AccessTokenPayloadType {}
export interface RefreshTokenPayload extends JwtPayload, RefreshTokenPayloadType {}
