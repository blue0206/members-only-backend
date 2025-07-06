import {
    mappedDtoValidator,
    mapPrismaRoleToEnumRole,
    getAvatarUrl,
} from '@members-only/core-utils';
import {
    LoginResponseSchema,
    RefreshResponseSchema,
    RegisterResponseSchema,
    UserSessionsResponseSchema,
} from '@blue0206/members-only-shared-types';
import type {
    LoginResponseDto,
    RefreshResponseDto,
    RegisterResponseDto,
    UserSessionsResponseDto,
} from '@blue0206/members-only-shared-types';
import type {
    GetSessionsServiceReturnType,
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
        id: data.id,
        username: data.username,
        firstname: data.firstName,
        middlename: data.middleName,
        lastname: data.lastName,
        avatar: data.avatar ? getAvatarUrl(data.avatar) : null,
        role: mapPrismaRoleToEnumRole(data.role),
        accessToken: data.accessToken,
    };

    const validatedData: RefreshResponseDto = mappedDtoValidator(
        mappedData,
        RefreshResponseSchema
    );
    return validatedData;
};

export const mapToUserSessionsResponseDto = (
    data: GetSessionsServiceReturnType
): UserSessionsResponseDto => {
    const mappedData: UserSessionsResponseDto = data.sessions.map((session) => ({
        sessionId: session.jwtId,
        userId: session.userId,
        userIp: session.ip,
        userAgent: session.userAgent,
        userLocation: session.location,
        lastUsedOn: session.createdAt,
        expires: session.expiresAt,
        currentSession: session.jwtId === data.currentSessionId,
    }));

    const validatedData: UserSessionsResponseDto = mappedDtoValidator(
        mappedData,
        UserSessionsResponseSchema
    );
    return validatedData;
};
