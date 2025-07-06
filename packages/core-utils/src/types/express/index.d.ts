import type { AccessTokenPayload } from '../../auth/auth.types.ts';
import type { ClientDetailsType } from '../../middlewares/assignClientDetails.ts';
import type { Logger } from 'pino';

declare global {
    namespace Express {
        interface Request {
            log: Logger;
            requestId: string;
            clientDetails?: ClientDetailsType;
            // req.user is populated with user details from access token payload on successful verification.
            user?: AccessTokenPayload;
        }
    }
}

export {};
