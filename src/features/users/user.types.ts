import type { Prisma, User } from '../../core/db/prisma-client/client.js';

// Return type for GetUserMessages service.
export type GetUserMessagesServiceReturnType = Prisma.UserGetPayload<{
    include: {
        messages: true;
    };
    omit: {
        password: true;
    };
}>;

// Return type for EditUser service.
export type EditUserServiceReturnType = Omit<User, 'password'>;

// Return type for SetMemberRole service
export type SetMemberRoleServiceReturnType = Pick<User, 'role'>;
