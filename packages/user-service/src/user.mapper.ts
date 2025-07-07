import { mappedDtoValidator } from '@members-only/core-utils/utils/mappedDtoValidator';
import { mapPrismaRoleToEnumRole } from '@members-only/core-utils/utils/roleMapper';
import { getAvatarUrl } from '@members-only/core-utils/cloudinary';
import {
    EditUserResponseSchema,
    GetUserBookmarksResponseSchema,
    GetUsersResponseSchema,
    UploadAvatarResponseSchema,
} from '@blue0206/members-only-shared-types/dtos/user.dto';
import type {
    EditUserResponseDto,
    GetUserBookmarksResponseDto,
    GetUsersResponseDto,
    UploadAvatarResponseDto,
} from '@blue0206/members-only-shared-types/dtos/user.dto';
import type {
    EditUserServiceReturnType,
    GetUserBookmarksServiceReturnType,
    GetUsersServiceReturnType,
    UploadAvatarServiceReturnType,
} from './user.types.js';

export const mapToGetUsersResponseDto = (
    data: GetUsersServiceReturnType
): GetUsersResponseDto => {
    const mappedData: GetUsersResponseDto = data.map(
        (user): GetUsersResponseDto[number] => ({
            id: user.id,
            username: user.username,
            firstname: user.firstName,
            middlename: user.middleName,
            lastname: user.lastName,
            role: mapPrismaRoleToEnumRole(user.role),
            avatar: user.avatar ? getAvatarUrl(user.avatar) : null,
            lastActive: user.lastActive,
            joinDate: user.createdAt,
            lastUpdate: user.updatedAt,
        })
    );

    const validatedData: GetUsersResponseDto = mappedDtoValidator(
        mappedData,
        GetUsersResponseSchema
    );
    return validatedData;
};

export const mapToEditUserResponseDto = (
    user: EditUserServiceReturnType
): EditUserResponseDto => {
    const mappedData: EditUserResponseDto = {
        id: user.id,
        username: user.username,
        firstname: user.firstName,
        middlename: user.middleName,
        lastname: user.lastName,
        avatar: user.avatar ? getAvatarUrl(user.avatar) : null,
        role: mapPrismaRoleToEnumRole(user.role),
    };

    const validatedData: EditUserResponseDto = mappedDtoValidator(
        mappedData,
        EditUserResponseSchema
    );
    return validatedData;
};

export const mapToUploadAvatarResponseDto = (
    data: UploadAvatarServiceReturnType
): UploadAvatarResponseDto => {
    const mappedData: UploadAvatarResponseDto = {
        avatar: getAvatarUrl(data.avatar),
    };

    const validatedData: UploadAvatarResponseDto = mappedDtoValidator(
        mappedData,
        UploadAvatarResponseSchema
    );
    return validatedData;
};

export const mapToGetUserBookmarksResponseDto = (
    bookmarks: GetUserBookmarksServiceReturnType
): GetUserBookmarksResponseDto => {
    const mappedData: GetUserBookmarksResponseDto = bookmarks.map(
        (bookmark): GetUserBookmarksResponseDto[number] => {
            return {
                messageId: bookmark.messageId,
                message: bookmark.message.content,
                user: bookmark.message.author
                    ? {
                          id: bookmark.message.author.id,
                          username: bookmark.message.author.username,
                          firstname: bookmark.message.author.firstName,
                          middlename: bookmark.message.author.middleName,
                          lastname: bookmark.message.author.lastName,
                          role: mapPrismaRoleToEnumRole(
                              bookmark.message.author.role
                          ),
                          avatar: bookmark.message.author.avatar
                              ? getAvatarUrl(bookmark.message.author.avatar)
                              : null,
                      }
                    : null,
                bookmarked: true,
                liked: bookmark.message.likes.some(
                    (like) => like.userId === bookmark.userId
                ),
                bookmarks: bookmark.message.bookmarks.length,
                likes: bookmark.message.likes.length,
                edited: bookmark.message.edited,
                messageTimestamp: bookmark.message.createdAt,
                timestamp: bookmark.createdAt,
            };
        }
    );

    const validatedData: GetUserBookmarksResponseDto = mappedDtoValidator(
        mappedData,
        GetUserBookmarksResponseSchema
    );
    return validatedData;
};
