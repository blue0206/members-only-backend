import type { Prisma, User } from '../../core/db/prisma-client/client.js';

export type GetUserMessagesServiceReturnType = Prisma.UserGetPayload<{
    include: {
        messages: {
            include: {
                author: {
                    omit: {
                        password: true;
                    };
                };
                likes: true;
                bookmarks: true;
            };
        };
    };
    omit: {
        password: true;
    };
}>;

export type EditUserServiceReturnType = Omit<User, 'password'>;
