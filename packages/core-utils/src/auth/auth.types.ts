import type { JwtPayload } from 'jsonwebtoken';
import { z } from 'zod';
import { Role } from '@blue0206/members-only-shared-types';

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
