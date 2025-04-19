import { GetUserMessagesResponseSchema } from '@blue0206/members-only-shared-types/dist/dtos/user.dto.js';
import { InternalServerError } from '../../core/errors/customErrors.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import type { GetUserMessagesResponseDto } from '@blue0206/members-only-shared-types/dist/dtos/user.dto.js';
import type { GetUserMessagesServiceReturnType } from './user.types.js';

export const mapToGetUserMessagesResponseDto = (
    data: GetUserMessagesServiceReturnType
): GetUserMessagesResponseDto => {
    // Map data.
    const mappedData: GetUserMessagesResponseDto = data.messages.map((message) => {
        if (data.role === 'USER') {
            return {
                messageId: message.id,
                message: message.content,
                timestamp: message.createdAt,
            };
        }
        return {
            messageId: message.id,
            message: message.content,
            timestamp: message.createdAt,
            username: data.username,
            edited: message.edited,
        };
    });

    // Parse mapped data against schema.
    const parsedData = GetUserMessagesResponseSchema.safeParse(mappedData);

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
