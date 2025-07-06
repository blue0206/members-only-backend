import type { Prisma, User } from '@members-only/database';

export type GetUsersServiceReturnType = Omit<User, 'password'>[];

export type EditUserServiceReturnType = Omit<User, 'password'>;

export interface UploadAvatarServiceReturnType {
    avatar: string;
}

export type GetUserBookmarksServiceReturnType = Prisma.BookmarkGetPayload<{
    include: {
        message: {
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
}>[];
