import { userService } from './user.service.js';
import {
    InternalServerError,
    UnauthorizedError,
    ValidationError,
} from '../../core/errors/customErrors.js';
import {
    mapToEditUserResponseDto,
    mapToGetUserBookmarksResponseDto,
    mapToGetUsersResponseDto,
} from './user.mapper.js';
import {
    EditUserRequestSchema,
    ErrorCodes,
    MemberRoleUpdateRequestSchema,
    MessageParamsSchema,
    ResetPasswordRequestSchema,
    SetRoleRequestQuerySchema,
    UsernameParamsSchema,
} from '@blue0206/members-only-shared-types';
import type { Request, Response } from 'express';
import type {
    EditUserServiceReturnType,
    GetUserBookmarksServiceReturnType,
    GetUsersServiceReturnType,
} from './user.types.js';
import type {
    ApiResponse,
    EditUserRequestDto,
    EditUserResponseDto,
    ResetPasswordRequestDto,
    MemberRoleUpdateRequestDto,
    SetRoleRequestQueryDto,
    UsernameParamsDto,
    GetUserBookmarksResponseDto,
    ApiResponseSuccess,
    MessageParamsDto,
    GetUsersResponseDto,
} from '@blue0206/members-only-shared-types';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }

    const users: GetUsersServiceReturnType = await userService.getUsers();

    const mappedUsers: GetUsersResponseDto = mapToGetUsersResponseDto(users);

    const successResponse: ApiResponse<GetUsersResponseDto> = {
        success: true,
        payload: mappedUsers,
        requestId: req.requestId,
        statusCode: 200,
    };
    res.status(200).json(successResponse);
};

export const editUser = async (req: Request, res: Response): Promise<void> => {
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    const parsedBody = EditUserRequestSchema.safeParse(req.body);
    if (!parsedBody.success) {
        throw new ValidationError(
            'Invalid request body.',
            ErrorCodes.VALIDATION_ERROR,
            parsedBody.error.flatten()
        );
    }

    const editUserData: EditUserRequestDto = parsedBody.data;
    const userData: EditUserServiceReturnType = await userService.editUser(
        editUserData,
        req.user,
        // Narrow the avatar buffer type to Buffer or undefined.
        req.files && 'newAvatar' in req.files && Array.isArray(req.files.newAvatar)
            ? req.files.newAvatar[0]?.buffer
            : undefined
    );

    const mappedUserData: EditUserResponseDto = mapToEditUserResponseDto(userData);

    const successResponse: ApiResponse<EditUserResponseDto> = {
        success: true,
        payload: mappedUserData,
        requestId: req.requestId,
        statusCode: 200,
    };
    res.status(200).json(successResponse);
};

export const adminDeleteUser = async (
    req: Request,
    res: Response
): Promise<void> => {
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    const parsedParams = UsernameParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
        throw new ValidationError(
            'Invalid request parameters.',
            ErrorCodes.VALIDATION_ERROR,
            parsedParams.error.flatten()
        );
    }

    const requestParam: UsernameParamsDto = parsedParams.data;
    await userService.deleteUserByUsername(requestParam.username, req.user.id);

    res.status(204).end();
};

export const deleteUserAccount = async (
    req: Request,
    res: Response
): Promise<void> => {
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    await userService.deleteAccount(req.user.id);
    res.status(204).end();
};

export const resetUserPassword = async (
    req: Request,
    res: Response
): Promise<void> => {
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    const parsedBody = ResetPasswordRequestSchema.safeParse(req.body);
    if (!parsedBody.success) {
        throw new ValidationError(
            'Invalid request body.',
            ErrorCodes.VALIDATION_ERROR,
            parsedBody.error.flatten()
        );
    }

    const resetPasswordData: ResetPasswordRequestDto = parsedBody.data;
    await userService.resetPassword(resetPasswordData, req.user.id);
    res.status(204).end();
};

export const memberRoleUpdate = async (
    req: Request,
    res: Response
): Promise<void> => {
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    const parsedBody = MemberRoleUpdateRequestSchema.safeParse(req.body);
    if (!parsedBody.success) {
        throw new ValidationError(
            'Invalid request body.',
            ErrorCodes.VALIDATION_ERROR,
            parsedBody.error.flatten()
        );
    }

    const memberRoleUpdateData: MemberRoleUpdateRequestDto = parsedBody.data;
    await userService.setMemberRole(req.user.id, memberRoleUpdateData.secretKey);
    res.status(204).end();
};

export const setRole = async (req: Request, res: Response): Promise<void> => {
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    const parsedParams = UsernameParamsSchema.safeParse(req.params);
    const parsedQuery = SetRoleRequestQuerySchema.safeParse(req.query);
    if (!parsedParams.success) {
        throw new ValidationError(
            'Invalid request params.',
            ErrorCodes.VALIDATION_ERROR,
            parsedParams.error.flatten()
        );
    }
    if (!parsedQuery.success) {
        throw new ValidationError(
            'Invalid request query.',
            ErrorCodes.VALIDATION_ERROR,
            parsedQuery.error.flatten()
        );
    }

    const usernameDto: UsernameParamsDto = parsedParams.data;
    const roleDto: SetRoleRequestQueryDto = parsedQuery.data;
    await userService.updateRole(
        req.user.id,
        req.user.username,
        usernameDto.username,
        roleDto.role
    );
    res.status(204).end();
};

export const deleteUserAvatar = async (
    req: Request,
    res: Response
): Promise<void> => {
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }
    const username = req.user.username;
    await userService.deleteUserAvatar(username);
    res.status(204).end();
};

export const userBookmarks = async (req: Request, res: Response): Promise<void> => {
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }
    const userId = req.user.id;

    const bookmarks: GetUserBookmarksServiceReturnType =
        await userService.getUserBookmarks(userId);

    const mappedBookmarks: GetUserBookmarksResponseDto =
        mapToGetUserBookmarksResponseDto(bookmarks);

    const successResponse: ApiResponseSuccess<GetUserBookmarksResponseDto> = {
        success: true,
        payload: mappedBookmarks,
        requestId: req.requestId,
        statusCode: 200,
    };
    res.status(200).json(successResponse);
};

export const addUserBookmark = async (
    req: Request,
    res: Response
): Promise<void> => {
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    const parsedParams = MessageParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
        throw new ValidationError(
            'Invalid request params.',
            ErrorCodes.VALIDATION_ERROR,
            parsedParams.error.flatten()
        );
    }
    const messageParams: MessageParamsDto = parsedParams.data;

    await userService.addBookmark(req.user.id, messageParams.messageId);

    const successResponse: ApiResponse<null> = {
        success: true,
        payload: null,
        requestId: req.requestId,
        statusCode: 201,
    };
    res.status(201).json(successResponse);
};

export const removeUserBookmark = async (
    req: Request,
    res: Response
): Promise<void> => {
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    const parsedParams = MessageParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
        throw new ValidationError(
            'Invalid request params.',
            ErrorCodes.VALIDATION_ERROR,
            parsedParams.error.flatten()
        );
    }
    const messageParams: MessageParamsDto = parsedParams.data;

    await userService.removeBookmark(req.user.id, messageParams.messageId);

    res.status(204).end();
};
