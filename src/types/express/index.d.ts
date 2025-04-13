import type { JwtPayload } from '../../features/auth/auth.types.ts';

declare global {
    namespace Express {
        interface Request {
            requestId?: string;
            user?: JwtPayload;
        }
    }
}

export {};
