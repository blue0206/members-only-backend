import type { Prisma, User } from '../../core/db/prisma-client/client.js';
export type GetUserMessagesServiceReturnType = Prisma.UserGetPayload<{
    include: {
        messages: true;
    };
    omit: {
        password: true;
    };
}>;
export type EditUserServiceReturnType = Omit<User, 'password'>;
