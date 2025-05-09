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

    // Validate mapped data against schema.
    const validatedData: GetUserMessagesResponseDto = mappedDtoValidator(
        mappedData,
        GetUserMessagesResponseSchema
    );
    return validatedData;
};

export const mapToEditUserResponseDto = (
    user: EditUserServiceReturnType
): EditUserResponseDto => {
    // Map data.
    const mappedData: EditUserResponseDto = {
        id: user.id,
        username: user.username,
        firstname: user.firstName,
        middlename: user.middleName,
        lastname: user.lastName,
        avatar: user.avatar ? getAvatarUrl(user.avatar) : null,
        role: mapPrismaRoleToEnumRole(user.role),
    };

    // Validate mapped data against schema.
    const validatedData: EditUserResponseDto = mappedDtoValidator(
        mappedData,
        EditUserResponseSchema
    );
    return validatedData;
};
