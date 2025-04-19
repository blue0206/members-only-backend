import { userService } from './user.service.js';
import {
    InternalServerError,
    UnauthorizedError,
} from '../../core/errors/customErrors.js';
import { mapToGetUserMessagesResponseDto } from './user.mapper.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import type { Request, Response } from 'express';
import type { GetUserMessagesServiceReturnType } from './user.types.js';
import type {
    GetUserMessagesResponseDto,
    ApiResponse,
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
