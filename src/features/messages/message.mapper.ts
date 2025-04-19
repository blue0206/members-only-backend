import {
    ErrorCodes,
    GetMessagesResponseSchema,
    GetMessagesWithoutAuthorResponseSchema,
} from '@blue0206/members-only-shared-types';
import type {
    GetMessagesResponseDto,
    GetMessagesWithoutAuthorResponseDto,
} from '@blue0206/members-only-shared-types';
import type { GetMessagesServiceReturnType } from './message.types.js';
import { InternalServerError } from '../../core/errors/customErrors.js';

export const mapToGetMessagesWithoutAuthorResponseDto = (
    messages: GetMessagesServiceReturnType
): GetMessagesWithoutAuthorResponseDto => {
    // Map data.
    const mappedData: GetMessagesWithoutAuthorResponseDto = messages.map(
        (message) => {
            return {
                messageId: message.id,
                message: message.content,
                timestamp: message.createdAt,
            };
        }
    );

    // Parse mapped data against schema.
    const parsedData = GetMessagesWithoutAuthorResponseSchema.safeParse(mappedData);

    // Throw error if parsing fails.
    if (!parsedData.success) {
        throw new InternalServerError(
            'DTO Mapping Error',
            ErrorCodes.INTERNAL_SERVER_ERROR,
            parsedData.error.flatten()
        );
    }

    // Return mapped, parsed data.
    return parsedData.data;
};

export const mapToGetMessagesResponseDto = (
    messages: GetMessagesServiceReturnType
): GetMessagesResponseDto => {
    // Map data.
    const mappedData: GetMessagesResponseDto = messages.map((message) => {
        return {
            messageId: message.id,
            message: message.content,
            timestamp: message.createdAt,
            username: message.author?.username,
            edited: message.edited,
        };
    });

    // Parse mapped data against schema.
    const parsedData = GetMessagesResponseSchema.safeParse(mappedData);

    // Throw error if parsing fails.
    if (!parsedData.success) {
        throw new InternalServerError(
            'DTO Mapping Error',
            ErrorCodes.INTERNAL_SERVER_ERROR,
            parsedData.error.flatten()
        );
    }

    // Return mapped, parsed data.
    return parsedData.data;
};
