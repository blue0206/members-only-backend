import mappedDtoValidator from '../../core/utils/mappedDtoValidator.js';
import { mapPrismaRoleToEnumRole } from '../../core/utils/roleMapper.js';
import {
    EditUserResponseSchema,
    GetUserMessagesResponseSchema,
} from '@blue0206/members-only-shared-types/dist/dtos/user.dto.js';
import { getAvatarUrl } from '../../core/lib/cloudinary.js';
import type {
    EditUserResponseDto,
    GetUserMessagesResponseDto,
} from '@blue0206/members-only-shared-types/dist/dtos/user.dto.js';
import type {
    EditUserServiceReturnType,
    GetUserMessagesServiceReturnType,
} from './user.types.js';

export const mapToGetUserMessagesResponseDto = (
    data: GetUserMessagesServiceReturnType
): GetUserMessagesResponseDto => {
    const mappedData: GetUserMessagesResponseDto = data.messages.map((message) => {
        if (data.role === 'USER') {
            return {
                messageId: message.id,
                message: message.content,
                likes: message.likes.length,
                bookmarks: message.bookmarks.length,
                timestamp: message.createdAt,
            };
        }
        return {
            messageId: message.id,
            message: message.content,
            // The message author details.
            user: message.author
                ? {
                      username: message.author.username,
                      firstname: message.author.firstName,
                      middlename: message.author.middleName,
                      lastname: message.author.lastName,
                      role: mapPrismaRoleToEnumRole(message.author.role),
                      avatar: message.author.avatar
                          ? getAvatarUrl(message.author.avatar)
                          : null,
                  }
                : null,
            likes: message.likes.length,
            bookmarks: message.bookmarks.length,
            // Boolean for whether message is bookmarked by logged-in user.
            bookmarked: message.bookmarks.some(
                (bookmark) => bookmark.userId === data.id
            ),
            // Boolean for whether message is liked by logged-in user.
            liked: message.likes.some((like) => like.userId === data.id),
            timestamp: message.createdAt,
            edited: message.edited,
        };
    });

    const validatedData: GetUserMessagesResponseDto = mappedDtoValidator(
        mappedData,
        GetUserMessagesResponseSchema
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
