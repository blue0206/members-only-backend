import {
    ErrorCodes,
    RegisterResponseSchema,
} from '@blue0206/members-only-shared-types';
import { mapPrismaRoleToEnumRole } from '../../core/utils/roleMapper.js';
import { InternalServerError } from '../../core/errors/customErrors.js';
import type { RegisterResponseDto } from '@blue0206/members-only-shared-types';
import type { RegisterServiceReturnType } from './auth.types.js';

export const mapToRegisterResponseDto = (
    userData: RegisterServiceReturnType
): RegisterResponseDto => {
    const mappedData: RegisterResponseDto = {
        id: userData.id,
        username: userData.username,
        firstname: userData.firstName,
        middlename: userData.middleName,
        lastname: userData.lastName,
        avatar: userData.avatar,
        role: mapPrismaRoleToEnumRole(userData.role),
        accessToken: userData.accessToken,
    };
    const parsedData = RegisterResponseSchema.safeParse(mappedData);
    if (!parsedData.success) {
        throw new InternalServerError(
            'DTO Mapping Error',
            ErrorCodes.INTERNAL_SERVER_ERROR,
            parsedData.error.flatten()
        );
    }
    return parsedData.data;
};
