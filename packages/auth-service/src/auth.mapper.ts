import { mappedDtoValidator } from '@members-only/core-utils/utils/mappedDtoValidator';
import { getAvatarUrl } from '@members-only/core-utils/cloudinary';
import { mapPrismaRoleToEnumRole } from '@members-only/core-utils/utils/roleMapper';
import { UserSessionsResponseSchema } from '@blue0206/members-only-shared-types/dtos/auth.dto';
import type {
    LoginResponseDto,
    RefreshResponseDto,
    RegisterResponseDto,
    UserSessionsResponseDto,
    RegisterResponseSchema,
    LoginResponseSchema,
    RefreshResponseSchema,
} from '@blue0206/members-only-shared-types/dtos/auth.dto';
import type {
    GetSessionsServiceReturnType,
    LoginServiceReturnType,
    RefreshServiceReturnType,
    RegisterServiceReturnType,
} from './auth.types.js';

// This is a union type for all authentication response DTOs with the SAME structure.
type AuthResponseDto = RegisterResponseDto | LoginResponseDto | RefreshResponseDto;
// This is a union type of zod schema for all authentication service response DTOs
// (again, with the SAME structure).
type AuthSchemaType =
    | typeof RegisterResponseSchema
    | typeof LoginResponseSchema
    | typeof RefreshResponseSchema;
// This is a generic type for the return type of the authentication service methods.
// Note that the return types of the service methods have different structures,
// so we need to use a generic type to map them correctly.
type AuthServiceReturnType<
    ServiceType extends
        | RegisterServiceReturnType
        | LoginServiceReturnType
        | RefreshServiceReturnType,
> = ServiceType;

export const mapToAuthResponseDto = <
    ServiceType extends
        | RegisterServiceReturnType
        | LoginServiceReturnType
        | RefreshServiceReturnType,
>(
    userData: AuthServiceReturnType<ServiceType>,
    schema: AuthSchemaType
): AuthResponseDto => {
    const mappedData: AuthResponseDto = {
        id: userData.id,
        username: userData.username,
        firstname: userData.firstName,
        middlename: userData.middleName,
        lastname: userData.lastName,
        avatar: userData.avatar ? getAvatarUrl(userData.avatar) : null,
        role: mapPrismaRoleToEnumRole(userData.role),
        accessToken: userData.accessToken,
    };

    const validatedData: AuthResponseDto = mappedDtoValidator(mappedData, schema);

    return validatedData;
};

export const mapToUserSessionsResponseDto = (
    data: GetSessionsServiceReturnType
): UserSessionsResponseDto => {
    const mappedData: UserSessionsResponseDto = data.sessions.map(
        (session): UserSessionsResponseDto[number] => ({
            sessionId: session.jwtId,
            userId: session.userId,
            userIp: session.ip,
            userAgent: session.userAgent,
            userLocation: session.location,
            lastUsedOn: session.createdAt,
            expires: session.expiresAt,
            currentSession: session.jwtId === data.currentSessionId,
        })
    );

    const validatedData: UserSessionsResponseDto = mappedDtoValidator(
        mappedData,
        UserSessionsResponseSchema
    );
    return validatedData;
};
