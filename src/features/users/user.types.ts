import type { Prisma } from '../../core/db/prisma-client/client.js';

export type GetUserMessagesServiceReturnType = Prisma.UserGetPayload<{
    include: {
        messages: true;
    };
    omit: {
        password: true;
    };
}>;
