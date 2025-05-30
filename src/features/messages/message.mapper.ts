import mappedDtoValidator from '../../core/utils/mappedDtoValidator.js';
import {
    CreateMessageResponseSchema,
    EditMessageResponseSchema,
    GetMessagesResponseSchema,
    GetMessagesWithoutAuthorResponseSchema,
} from '@blue0206/members-only-shared-types';
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
    messages: GetMessagesServiceReturnType
): GetMessagesResponseDto => {
    const mappedData: GetMessagesResponseDto = messages.map((message) => {
        return {
            messageId: message.id,
            message: message.content,
            timestamp: message.createdAt,
            username: message.author?.username,
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
    data: CreateMessageServiceReturnType
): CreateMessageResponseDto => {
    let mappedData: CreateMessageResponseDto;
    if (data.author?.role === 'USER') {
        mappedData = {
            messageId: data.id,
            message: data.content,
            timestamp: data.createdAt,
        };
    } else {
        mappedData = {
            messageId: data.id,
            message: data.content,
            timestamp: data.createdAt,
            username: data.author?.username,
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
    data: EditMessageServiceReturnType
): EditMessageResponseDto => {
    const mappedData: EditMessageResponseDto = {
        messageId: data.id,
        message: data.content,
        timestamp: data.createdAt,
        edited: data.edited,
        username: data.author?.username,
    };

    const validatedData: EditMessageResponseDto = mappedDtoValidator(
        mappedData,
        EditMessageResponseSchema
    );
    return validatedData;
};
