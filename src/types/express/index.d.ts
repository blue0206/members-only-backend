import type { AccessTokenPayload } from '../../features/auth/auth.types.ts';
import type { ClientDetailsType } from '../../core/middlewares/assignClientDetails.ts';

declare global {
    namespace Express {
        interface Request {
            requestId?: string;
            clientDetails?: ClientDetailsType;
            // req.user is populated with user details from access token payload on successful verification.
            user?: AccessTokenPayload;
        }
    }
}

export {};
