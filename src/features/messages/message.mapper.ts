import mappedDtoValidator from '../../core/utils/mappedDtoValidator.js';
import {
    CreateMessageResponseSchema,
    EditMessageResponseSchema,
    GetMessagesResponseSchema,
    GetMessagesWithoutAuthorResponseSchema,
} from '@blue0206/members-only-shared-types';
import { mapPrismaRoleToEnumRole } from '../../core/utils/roleMapper.js';
import { getAvatarUrl } from '../../core/lib/cloudinary.js';
import type {
    CreateMessageResponseDto,
    EditMessageResponseDto,
    GetMessagesResponseDto,
    GetMessagesWithoutAuthorResponseDto,
} from '@blue0206/members-only-shared-types';
import type {
    CreateMessageServiceReturnType,
    EditMessageServiceReturnType,
    GetMessagesServiceReturnType,
} from './message.types.js';

export const mapToGetMessagesWithoutAuthorResponseDto = (
    messages: GetMessagesServiceReturnType
): GetMessagesWithoutAuthorResponseDto => {
    const mappedData: GetMessagesWithoutAuthorResponseDto = messages.map(
        (message) => {
            return {
                messageId: message.id,
                message: message.content,
                likes: message.likes.length,
                bookmarks: message.bookmarks.length,
                timestamp: message.createdAt,
            };
        }
    );

    const validatedData: GetMessagesWithoutAuthorResponseDto = mappedDtoValidator(
        mappedData,
        GetMessagesWithoutAuthorResponseSchema
    );
    return validatedData;
};

export const mapToGetMessagesResponseDto = (
    messages: GetMessagesServiceReturnType,
    userId: number
): GetMessagesResponseDto => {
    const mappedData: GetMessagesResponseDto = messages.map((message) => {
        return {
            messageId: message.id,
            message: message.content,
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
            bookmarked: message.bookmarks.some(
                (bookmark) => bookmark.userId === userId
            ),
            liked: message.likes.some((like) => like.userId === userId),
            bookmarks: message.bookmarks.length,
            likes: message.likes.length,
            timestamp: message.createdAt,
            edited: message.edited,
        };
    });

    const validatedData: GetMessagesResponseDto = mappedDtoValidator(
        mappedData,
        GetMessagesResponseSchema
    );
    return validatedData;
};

export const mapToCreateMessageResponseDto = (
    data: CreateMessageServiceReturnType,
    userId: number
): CreateMessageResponseDto => {
    let mappedData: CreateMessageResponseDto;
    if (data.author?.role === 'USER') {
        mappedData = {
            messageId: data.id,
            message: data.content,
            likes: data.likes.length,
            bookmarks: data.bookmarks.length,
            timestamp: data.createdAt,
        };
    } else {
        mappedData = {
            messageId: data.id,
            message: data.content,
            user: data.author
                ? {
                      username: data.author.username,
                      firstname: data.author.firstName,
                      middlename: data.author.middleName,
                      lastname: data.author.lastName,
                      role: mapPrismaRoleToEnumRole(data.author.role),
                      avatar: data.author.avatar
                          ? getAvatarUrl(data.author.avatar)
                          : null,
                  }
                : null,
            bookmarked: data.bookmarks.some(
                (bookmark) => bookmark.userId === userId
            ),
            liked: data.likes.some((like) => like.userId === userId),
            bookmarks: data.bookmarks.length,
            likes: data.likes.length,
            timestamp: data.createdAt,
            edited: data.edited,
        };
    }

    const validatedData: CreateMessageResponseDto = mappedDtoValidator(
        mappedData,
        CreateMessageResponseSchema
    );
    return validatedData;
};

export const mapToEditMessageResponseDto = (
    data: EditMessageServiceReturnType,
    userId: number
): EditMessageResponseDto => {
    const mappedData: EditMessageResponseDto = {
        messageId: data.id,
        message: data.content,
        user: data.author
            ? {
                  username: data.author.username,
                  firstname: data.author.firstName,
                  middlename: data.author.middleName,
                  lastname: data.author.lastName,
                  role: mapPrismaRoleToEnumRole(data.author.role),
                  avatar: data.author.avatar
                      ? getAvatarUrl(data.author.avatar)
                      : null,
              }
            : null,
        bookmarked: data.bookmarks.some((bookmark) => bookmark.userId === userId),
        liked: data.likes.some((like) => like.userId === userId),
        bookmarks: data.bookmarks.length,
        likes: data.likes.length,
        timestamp: data.createdAt,
        edited: data.edited,
    };

    const validatedData: EditMessageResponseDto = mappedDtoValidator(
        mappedData,
        EditMessageResponseSchema
    );
    return validatedData;
};
