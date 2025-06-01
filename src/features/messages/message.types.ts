import type { Prisma } from '../../core/db/prisma-client/client.js';

export type GetMessagesServiceReturnType = Prisma.MessageGetPayload<{
    include: {
        author: {
            omit: {
                password: true;
            };
        };
        likes: true;
        bookmarks: true;
    };
}>[];

export type CreateMessageServiceReturnType = GetMessagesServiceReturnType[number];

export type EditMessageServiceReturnType = CreateMessageServiceReturnType;

export type LikeMessageServiceReturnType = Prisma.LikeGetPayload<{
    include: {
        message: {
            include: {
                likes: true;
            };
        };
    };
}>;
