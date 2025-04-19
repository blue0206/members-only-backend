import type { Prisma } from '../../core/db/prisma-client/client.js';

export type GetMessagesServiceReturnType = Prisma.MessageGetPayload<{
    include: {
        author: true;
    };
}>[];

export type CreateMessageServiceReturnType = Prisma.MessageGetPayload<{
    include: {
        author: true;
    };
}>;
