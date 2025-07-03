import { userService } from './user.service.js';
import {
    InternalServerError,
    UnauthorizedError,
} from '../../core/errors/customErrors.js';
import {
    mapToEditUserResponseDto,
    mapToGetUserBookmarksResponseDto,
    mapToGetUsersResponseDto,
    mapToUploadAvatarResponseDto,
} from './user.mapper.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import type { Request, Response } from 'express';
import type {
    EditUserServiceReturnType,
    GetUserBookmarksServiceReturnType,
    GetUsersServiceReturnType,
    UploadAvatarServiceReturnType,
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
    UploadAvatarResponseDto,
} from '@blue0206/members-only-shared-types';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
    const users: GetUsersServiceReturnType = await userService.getUsers(req.log);

    const mappedUsers: GetUsersResponseDto = mapToGetUsersResponseDto(users);

    const successResponse: ApiResponse<GetUsersResponseDto> = {
        success: true,
        payload: mappedUsers,
        requestId: req.requestId,
        statusCode: 200,
    };
    res.status(200).json(successResponse);
};

export const editUser = async (
    req: Request<unknown, unknown, EditUserRequestDto>,
    res: Response
): Promise<void> => {
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    const userData: EditUserServiceReturnType = await userService.editUser(
        req.body,
        req.user,
        req.log
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
    req: Request<UsernameParamsDto>,
    res: Response
): Promise<void> => {
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    await userService.deleteUserByUsername(
        req.params.username,
        req.user.id,
        req.log
    );

    res.status(204).end();
};

export const deleteUserAccount = async (
    req: Request,
    res: Response
): Promise<void> => {
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    await userService.deleteAccount(req.user.id, req.log);
    res.status(204).end();
};

export const resetUserPassword = async (
    req: Request<unknown, unknown, ResetPasswordRequestDto>,
    res: Response
): Promise<void> => {
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    await userService.resetPassword(req.body, req.user.id, req.log);

    res.status(204).end();
};

export const memberRoleUpdate = async (
    req: Request<unknown, unknown, MemberRoleUpdateRequestDto>,
    res: Response
): Promise<void> => {
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }
    await userService.setMemberRole(req.user.id, req.body.secretKey, req.log);

    res.status(204).end();
};

export const setRole = async (
    req: Request<UsernameParamsDto, unknown, unknown, SetRoleRequestQueryDto>,
    res: Response
): Promise<void> => {
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    await userService.updateRole(
        req.user.id,
        req.user.username,
        req.params.username,
        req.query.role,
        req.log
    );

    res.status(204).end();
};

export const uploadUserAvatar = async (
    req: Request,
    res: Response
): Promise<void> => {
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }
    if (!req.file) {
        throw new InternalServerError(
            'File not found in request.',
            ErrorCodes.FILE_UPLOAD_ERROR
        );
    }

    const serviceData: UploadAvatarServiceReturnType =
        await userService.uploadUserAvatar(req.user, req.file.buffer, req.log);

    const mappedData: UploadAvatarResponseDto =
        mapToUploadAvatarResponseDto(serviceData);

    const successResponse: ApiResponse<UploadAvatarResponseDto> = {
        success: true,
        payload: mappedData,
        requestId: req.requestId,
        statusCode: 200,
    };
    res.status(200).json(successResponse);
};

export const deleteUserAvatar = async (
    req: Request,
    res: Response
): Promise<void> => {
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    const username = req.user.username;
    await userService.deleteUserAvatar(username, req.log);

    res.status(204).end();
};

export const userBookmarks = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }
    const userId = req.user.id;

    const bookmarks: GetUserBookmarksServiceReturnType =
        await userService.getUserBookmarks(userId, req.log);

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
    req: Request<unknown>,
    res: Response
): Promise<void> => {
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    await userService.addBookmark(
        req.user.id,
        parseInt((req.params as MessageParamsDto).messageId as unknown as string),
        req.log
    );

    const successResponse: ApiResponse<null> = {
        success: true,
        payload: null,
        requestId: req.requestId,
        statusCode: 201,
    };
    res.status(201).json(successResponse);
};

export const removeUserBookmark = async (
    req: Request<unknown>,
    res: Response
): Promise<void> => {
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    await userService.removeBookmark(
        req.user.id,
        parseInt((req.params as MessageParamsDto).messageId as unknown as string),
        req.log
    );

    res.status(204).end();
};
