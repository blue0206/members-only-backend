import { userService } from './user.service.js';
import {
    InternalServerError,
    UnauthorizedError,
    ValidationError,
} from '../../core/errors/customErrors.js';
import {
    mapToEditUserResponseDto,
    mapToGetUserMessagesResponseDto,
    mapToMemberRoleUpdateResponseDto,
} from './user.mapper.js';
import {
    EditUserRequestSchema,
    ErrorCodes,
    MemberRoleUpdateRequestSchema,
    ResetPasswordRequestSchema,
    SetRoleRequestQuerySchema,
    UsernameParamsSchema,
} from '@blue0206/members-only-shared-types';
import type { Request, Response } from 'express';
import type {
    EditUserServiceReturnType,
    GetUserMessagesServiceReturnType,
    SetMemberRoleServiceReturnType,
} from './user.types.js';
import type {
    GetUserMessagesResponseDto,
    ApiResponse,
    EditUserRequestDto,
    EditUserResponseDto,
    ResetPasswordRequestDto,
    MemberRoleUpdateRequestDto,
    MemberRoleUpdateResponseDto,
    SetRoleRequestQueryDto,
    UsernameParamsDto,
} from '@blue0206/members-only-shared-types';

export const userMessages = async (req: Request, res: Response): Promise<void> => {
    // Throw error if request id is missing.
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }
    // Throw error if request object is not populated correctly by verification middleware.
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    // Invoke the service with user ID.
    const data: GetUserMessagesServiceReturnType = await userService.getUserMessages(
        req.user.id
    );

    // Map service return type to DTO to adhere with API contract.
    const userMessages: GetUserMessagesResponseDto =
        mapToGetUserMessagesResponseDto(data);

    // Create success response object adhering with API Contract.
    const successResponse: ApiResponse<GetUserMessagesResponseDto> = {
        success: true,
        data: userMessages,
        requestId: req.requestId,
        statusCode: 200,
    };

    // Send Response.
    res.status(200).json(successResponse);
};

export const editUser = async (req: Request, res: Response): Promise<void> => {
    // Throw error if request id is missing.
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }

    // Throw error if request object is not populated correctly by verification middleware.
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    // Validate the incoming request to make sure it adheres to the
    // API contract (EditUserRequestDto).
    const parsedBody = EditUserRequestSchema.safeParse(req.body);
    // Throw Error if validation fails.
    if (!parsedBody.success) {
        throw new ValidationError(
            'Invalid request body.',
            ErrorCodes.VALIDATION_ERROR,
            parsedBody.error.flatten()
        );
    }

    // Extract the EditUserRequestDto object from the parsedBody.
    const editUserData: EditUserRequestDto = parsedBody.data;

    // Pass the parsed DTO and the avatar buffer to the service layer.
    const userData: EditUserServiceReturnType = await userService.editUser(
        editUserData,
        req.user,
        // Narrow the avatar buffer type to Buffer or undefined.
        req.files && 'newAvatar' in req.files && Array.isArray(req.files.newAvatar)
            ? req.files.newAvatar[0]?.buffer
            : undefined
    );

    // Map the data returned by the service layer to the EditUserResponseDto
    // to adhere to API contract.
    const mappedUserData: EditUserResponseDto = mapToEditUserResponseDto(userData);

    // Create success response object adhering with API Contract.
    const successResponse: ApiResponse<EditUserResponseDto> = {
        success: true,
        data: mappedUserData,
        requestId: req.requestId,
        statusCode: 200,
    };

    // Send Response.
    res.status(200).json(successResponse);
};

export const adminDeleteUser = async (
    req: Request,
    res: Response
): Promise<void> => {
    // Throw error if request id is missing.
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }

    // Validate the incoming request to make sure it adheres to the
    // API contract.
    const parsedParams = UsernameParamsSchema.safeParse(req.params);
    // Throw Error if validation fails.
    if (!parsedParams.success) {
        throw new ValidationError(
            'Invalid request parameters.',
            ErrorCodes.VALIDATION_ERROR,
            parsedParams.error.flatten()
        );
    }

    // Extract the UsernameParamsDto object from the parsedParams.
    const requestParam: UsernameParamsDto = parsedParams.data;

    // Pass the parsed DTO to the service layer.
    await userService.deleteUserByUsername(requestParam.username);

    // Send a success response with 204.
    res.status(204).end();
};

export const deleteUserAccount = async (
    req: Request,
    res: Response
): Promise<void> => {
    // Throw error if request id is missing.
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }

    // Throw error if request object is not populated correctly by verification middleware.
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    // Pass the user ID to the service layer.
    await userService.deleteAccount(req.user.id);

    // Send a success response with 204.
    res.status(204).end();
};

export const resetUserPassword = async (
    req: Request,
    res: Response
): Promise<void> => {
    // Throw error if request id is missing.
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }

    // Throw error if request object is not populated correctly by verification middleware.
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    // Validate the incoming request to make sure it adheres to the
    // API contract (ResetPasswordRequestDto).
    const parsedBody = ResetPasswordRequestSchema.safeParse(req.body);
    // Throw Error if validation fails.
    if (!parsedBody.success) {
        throw new ValidationError(
            'Invalid request body.',
            ErrorCodes.VALIDATION_ERROR,
            parsedBody.error.flatten()
        );
    }

    // Extract the ResetPasswordRequestDto object from the parsedBody.
    const resetPasswordData: ResetPasswordRequestDto = parsedBody.data;

    // Pass the parsed DTO to the service layer.
    await userService.resetPassword(resetPasswordData, req.user.id);

    // Send a success response with 204.
    res.status(204).end();
};

export const memberRoleUpdate = async (
    req: Request,
    res: Response
): Promise<void> => {
    // Throw error if request id is missing.
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }

    // Throw error if request object is not populated correctly by verification middleware.
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    // Validate the incoming request to make sure it adheres to the
    // API contract (MemberRoleUpdateRequestDto).
    const parsedBody = MemberRoleUpdateRequestSchema.safeParse(req.body);
    // Throw Error if validation fails.
    if (!parsedBody.success) {
        throw new ValidationError(
            'Invalid request body.',
            ErrorCodes.VALIDATION_ERROR,
            parsedBody.error.flatten()
        );
    }

    // Extract the MemberRoleUpdateRequestDto object from the parsedBody.
    const memberRoleUpdateData: MemberRoleUpdateRequestDto = parsedBody.data;

    // Pass the parsed DTO to the service layer.
    const updatedUser: SetMemberRoleServiceReturnType =
        await userService.setMemberRole(req.user.id, memberRoleUpdateData.secretKey);

    // Map the data returned by the service layer to the SetMemberRoleResponseDto
    // to adhere to API contract.
    const mappedData: MemberRoleUpdateResponseDto =
        mapToMemberRoleUpdateResponseDto(updatedUser);

    // Create success response object adhering with API Contract.
    const successResponse: ApiResponse<MemberRoleUpdateResponseDto> = {
        success: true,
        data: mappedData,
        requestId: req.requestId,
        statusCode: 200,
    };

    // Send success response.
    res.status(200).json(successResponse);
};

export const setRole = async (req: Request, res: Response): Promise<void> => {
    // Throw error if request id is missing.
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }

    // Validate the incoming request to make sure it adheres to the
    // API contract.
    const parsedParams = UsernameParamsSchema.safeParse(req.params);
    const parsedQuery = SetRoleRequestQuerySchema.safeParse(req.query);
    // Throw Error if validation fails.
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

    // Extract the DTOs for the username and the new role of the user
    // to be updated.
    const usernameDto: UsernameParamsDto = parsedParams.data;
    const roleDto: SetRoleRequestQueryDto = parsedQuery.data;

    // Pass the parsed data to the service layer.
    await userService.updateRole(usernameDto.username, roleDto.role);

    // Send a success response with 204.
    res.status(204).end();
};
