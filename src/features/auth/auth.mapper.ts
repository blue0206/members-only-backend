import mappedDtoValidator from '../../core/utils/mappedDtoValidator.js';
import { mapPrismaRoleToEnumRole } from '../../core/utils/roleMapper.js';
import { getAvatarUrl } from '../../core/lib/cloudinary.js';
import {
    LoginResponseSchema,
    RefreshResponseSchema,
    RegisterResponseSchema,
} from '@blue0206/members-only-shared-types';
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
    const mappedData: RegisterResponseDto = {
        id: userData.id,
        username: userData.username,
        firstname: userData.firstName,
        middlename: userData.middleName,
        lastname: userData.lastName,
        avatar: userData.avatar ? getAvatarUrl(userData.avatar) : null,
        role: mapPrismaRoleToEnumRole(userData.role),
        accessToken: userData.accessToken,
    };

    const validatedData: RegisterResponseDto = mappedDtoValidator(
        mappedData,
        RegisterResponseSchema
    );
    return validatedData;
};

export const mapToLoginResponseDto = (
    userData: LoginServiceReturnType
): LoginResponseDto => {
    const mappedData: LoginResponseDto = {
        id: userData.id,
        username: userData.username,
        firstname: userData.firstName,
        middlename: userData.middleName,
        lastname: userData.lastName,
        avatar: userData.avatar ? getAvatarUrl(userData.avatar) : null,
        role: mapPrismaRoleToEnumRole(userData.role),
        accessToken: userData.accessToken,
    };

    const validatedData: LoginResponseDto = mappedDtoValidator(
        mappedData,
        LoginResponseSchema
    );
    return validatedData;
};

export const mapToRefreshResponseDto = (
    data: RefreshServiceReturnType
): RefreshResponseDto => {
    const mappedData: RefreshResponseDto = {
        accessToken: data.accessToken,
    };

    const validatedData: RefreshResponseDto = mappedDtoValidator(
        mappedData,
        RefreshResponseSchema
    );
    return validatedData;
};
