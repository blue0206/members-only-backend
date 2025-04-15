import {
    ErrorCodes,
    LoginResponseSchema,
    RefreshResponseSchema,
    RegisterResponseSchema,
} from '@blue0206/members-only-shared-types';
import { mapPrismaRoleToEnumRole } from '../../core/utils/roleMapper.js';
import { InternalServerError } from '../../core/errors/customErrors.js';
import type {
    LoginResponseDto,
    RefreshResponseDto,
    RegisterResponseDto,
} from '@blue0206/members-only-shared-types';
import type {
    LoginServiceReturnType,
    RefreshServiceReturnType,
    RegisterServiceReturnType,
} from './auth.types.js';

export const mapToRegisterResponseDto = (
    userData: RegisterServiceReturnType
): RegisterResponseDto => {
    // Map data.
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
    // Parse mapped data against schema.
    const parsedData = RegisterResponseSchema.safeParse(mappedData);
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

export const mapToLoginResponseDto = (
    userData: LoginServiceReturnType
): LoginResponseDto => {
    // Map data.
    const mappedData: LoginResponseDto = {
        id: userData.id,
        username: userData.username,
        firstname: userData.firstName,
        middlename: userData.middleName,
        lastname: userData.lastName,
        avatar: userData.avatar,
        role: mapPrismaRoleToEnumRole(userData.role),
        accessToken: userData.accessToken,
    };
    // Parse mapped data against schema.
    const parsedData = LoginResponseSchema.safeParse(mappedData);
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

export const mapToRefreshResponseDto = (
    data: RefreshServiceReturnType
): RefreshResponseDto => {
    // Map data.
    const mappedData: RefreshResponseDto = {
        accessToken: data.accessToken,
    };
    // Parse mapped data against schema.
    const parsedData = RefreshResponseSchema.safeParse(mappedData);
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
