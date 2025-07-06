import type {
    AccessTokenPayload,
    ClientDetailsType,
    Logger,
} from '@members-only/core-utils';

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
