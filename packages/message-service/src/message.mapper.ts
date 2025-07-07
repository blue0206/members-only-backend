import { mappedDtoValidator } from '@members-only/core-utils/utils/mappedDtoValidator';
import { mapPrismaRoleToEnumRole } from '@members-only/core-utils/utils/roleMapper';
import { getAvatarUrl } from '@members-only/core-utils/cloudinary';
import {
    CreateMessageResponseSchema,
    EditMessageResponseSchema,
    GetMessagesResponseSchema,
    GetMessagesWithoutAuthorResponseSchema,
} from '@blue0206/members-only-shared-types/dtos/message.dto';
import type {
    CreateMessageResponseDto,
    EditMessageResponseDto,
    GetMessagesResponseDto,
    GetMessagesWithoutAuthorResponseDto,
} from '@blue0206/members-only-shared-types/dtos/message.dto';
import type {
    CreateMessageServiceReturnType,
    EditMessageServiceReturnType,
    GetMessagesServiceReturnType,
} from './message.types.js';

// EditMessageServiceReturnType is the same as CreateMessageServiceReturnType,
// and GetMessagesServiceReturnType is an array of messages with the same
// structure as CreateMessageServiceReturnType, so we can use the same mapping
// function for both.

export const mapToMessagesWithoutAuthorResponseDto = (
    messages: GetMessagesServiceReturnType
): GetMessagesWithoutAuthorResponseDto => {
    const mappedData: GetMessagesWithoutAuthorResponseDto = messages.map(
        (message): GetMessagesWithoutAuthorResponseDto[number] => {
            return {
                messageId: message.id,
                message: message.content,
                likes: message.likes.length,
                bookmarks: message.bookmarks.length,
                userId: message.authorId,
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

// Expects an array of messages with author information. The structure of the
// messages is exactly the same for edit, create (with author),
// and get messages with the exception of the get messages service being an array
// of messages, while the create and edit being a single message.
export const mapToMessagesWithAuthorResponseDto = (
    messages: GetMessagesServiceReturnType,
    userId: number
): GetMessagesResponseDto => {
    const mappedData: GetMessagesResponseDto = messages.map(
        (message): GetMessagesResponseDto[number] => {
            return {
                messageId: message.id,
                message: message.content,
                user: message.author
                    ? {
                          id: message.author.id,
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
        }
    );

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
        mappedData = mapToMessagesWithoutAuthorResponseDto([data])[0];
    } else {
        mappedData = mapToMessagesWithAuthorResponseDto([data], userId)[0];
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
    const mappedData: EditMessageResponseDto = mapToMessagesWithAuthorResponseDto(
        [data],
        userId
    )[0];

    const validatedData: EditMessageResponseDto = mappedDtoValidator(
        mappedData,
        EditMessageResponseSchema
    );
    return validatedData;
};
