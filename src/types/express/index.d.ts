import type { AccessTokenPayload } from '../../features/auth/auth.types.ts';

declare global {
    namespace Express {
        interface Request {
            requestId?: string;
            // req.user is populated with user details from access token payload on successful verification.
            user?: AccessTokenPayload;
        }
    }
}

export {};
