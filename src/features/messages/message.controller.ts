import { messageService } from './message.service.js';
import {
    ForbiddenError,
    InternalServerError,
    UnauthorizedError,
    ValidationError,
} from '../../core/errors/customErrors.js';
import {
    CreateMessageRequestSchema,
    ErrorCodes,
    Role,
} from '@blue0206/members-only-shared-types';
import {
    mapToCreateMessageResponseDto,
    mapToGetMessagesResponseDto,
    mapToGetMessagesWithoutAuthorResponseDto,
} from './message.mapper.js';
import type { Request, Response } from 'express';
import type {
    ApiResponse,
    GetMessagesResponseDto,
    GetMessagesWithoutAuthorResponseDto,
    CreateMessageRequestDto,
    CreateMessageResponseDto,
} from '@blue0206/members-only-shared-types';
import type {
    CreateMessageServiceReturnType,
    GetMessagesServiceReturnType,
} from './message.types.js';

export const getMessagesWithoutAuthor = async (
    req: Request,
    res: Response
): Promise<void> => {
    // Throw error if request id is missing.
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }

    // Get messages from service layer.
    const messages: GetMessagesServiceReturnType =
        await messageService.getMessages();

    // Map service return type to DTO to adhere with API contract.
    const mappedMessages: GetMessagesWithoutAuthorResponseDto =
        mapToGetMessagesWithoutAuthorResponseDto(messages);

    // Create success response object adhering with API Contract.
    const successResponse: ApiResponse<GetMessagesWithoutAuthorResponseDto> = {
        success: true,
        data: mappedMessages,
        requestId: req.requestId,
        statusCode: 200,
    };

    // Send success response.
    res.status(200).json(successResponse);
};

export const getMessagesWithAuthor = async (
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

    // Throw error if the role of the user is not admin or member.
    if (req.user.role === Role.USER) {
        throw new ForbiddenError(
            'Member or Admin privileges are required.',
            ErrorCodes.FORBIDDEN
        );
    }

    // Get messages from service layer.
    const messages: GetMessagesServiceReturnType =
        await messageService.getMessages();

    // Map service return type to DTO to adhere with API contract.
    const mappedMessages: GetMessagesResponseDto =
        mapToGetMessagesResponseDto(messages);

    // Create success response object adhering with API Contract.
    const successResponse: ApiResponse<GetMessagesResponseDto> = {
        success: true,
        data: mappedMessages,
        requestId: req.requestId,
        statusCode: 200,
    };

    // Send success response.
    res.status(200).json(successResponse);
};

export const createNewMessage = async (
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
    // API contract (CreateMessageRequestDto).
    const parsedBody = CreateMessageRequestSchema.safeParse(req.body);
    // Throw Error if validation fails.
    if (!parsedBody.success) {
        throw new ValidationError(
            'Invalid request body.',
            ErrorCodes.VALIDATION_ERROR,
            parsedBody.error.flatten()
        );
    }

    // Extract the CreateMessageRequestDto object from the parsedBody.
    const newMessageContent: CreateMessageRequestDto = parsedBody.data;

    // Pass the extracted DTO to the service layer along with user ID from request object.
    const createdMessage: CreateMessageServiceReturnType =
        await messageService.createMessage(newMessageContent.message, req.user.id);

    // Map service return type to DTO to adhere with API contract.
    const mappedCreatedMessage: CreateMessageResponseDto =
        mapToCreateMessageResponseDto(createdMessage);

    // Create success response object adhering with API Contract.
    const successResponse: ApiResponse<CreateMessageResponseDto> = {
        success: true,
        data: mappedCreatedMessage,
        requestId: req.requestId,
        statusCode: 201,
    };

    // Send success response.
    res.status(201).json(successResponse);
};
