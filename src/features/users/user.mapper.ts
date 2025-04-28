import { InternalServerError } from '../../core/errors/customErrors.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import { mapPrismaRoleToEnumRole } from '../../core/utils/roleMapper.js';
import {
    EditUserResponseSchema,
    GetUserMessagesResponseSchema,
    MemberRoleUpdateResponseSchema,
} from '@blue0206/members-only-shared-types/dist/dtos/user.dto.js';
import { getAvatarUrl } from '../../core/lib/cloudinary.js';
import type {
    EditUserResponseDto,
    GetUserMessagesResponseDto,
    MemberRoleUpdateResponseDto,
} from '@blue0206/members-only-shared-types/dist/dtos/user.dto.js';
import type {
    EditUserServiceReturnType,
    GetUserMessagesServiceReturnType,
    SetMemberRoleServiceReturnType,
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

    // Parse mapped data against schema.
    const parsedData = EditUserResponseSchema.safeParse(mappedData);

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

export const mapToMemberRoleUpdateResponseDto = (
    data: SetMemberRoleServiceReturnType
): MemberRoleUpdateResponseDto => {
    // Map data.
    const mappedData: MemberRoleUpdateResponseDto = {
        role: mapPrismaRoleToEnumRole(data.role),
    };

    // Parse mapped data against schema.
    const parsedData = MemberRoleUpdateResponseSchema.safeParse(mappedData);

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
