import type { Prisma } from '@members-only/database';

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
