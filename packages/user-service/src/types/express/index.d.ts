import type { ClientDetailsType } from '@members-only/core-utils/middlewares/assignClientDetails';
import type { AccessTokenPayload } from '@members-only/core-utils/authTypes';
import type { Logger } from '@members-only/core-utils/logger';

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
