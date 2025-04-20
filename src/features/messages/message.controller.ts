import { messageService } from './message.service.js';
import {
    InternalServerError,
    UnauthorizedError,
    ValidationError,
} from '../../core/errors/customErrors.js';
import {
    CreateMessageRequestSchema,
    EditMessageRequestParamsSchema,
    EditMessageRequestSchema,
    ErrorCodes,
} from '@blue0206/members-only-shared-types';
import {
    mapToCreateMessageResponseDto,
    mapToEditMessageResponseDto,
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
    EditMessageRequestDto,
    EditMessageResponseDto,
} from '@blue0206/members-only-shared-types';
import type {
    CreateMessageServiceReturnType,
    EditMessageServiceReturnType,
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

export const editMessage = async (req: Request, res: Response): Promise<void> => {
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
    // API contract (EditMessageRequestDto).
    const parsedBody = EditMessageRequestSchema.safeParse(req.body);
    const parsedParams = EditMessageRequestParamsSchema.safeParse(req.params);

    // Throw Error if validation fails.
    if (!parsedBody.success) {
        throw new ValidationError(
            'Invalid request body.',
            ErrorCodes.VALIDATION_ERROR,
            parsedBody.error.flatten()
        );
    }
    if (!parsedParams.success) {
        throw new ValidationError(
            'Invalid request params.',
            ErrorCodes.VALIDATION_ERROR,
            parsedParams.error.flatten()
        );
    }

    // Extract the EditMessageRequestDto object from the parsedBody.
    const messageEditData: EditMessageRequestDto = parsedBody.data;

    // Pass the extracted DTO to the service layer along with user ID from request object.
    const editedMessage: EditMessageServiceReturnType =
        await messageService.editMessage(
            messageEditData.newMessage,
            parsedParams.data.messageId,
            req.user
        );

    // Map service return type to DTO to adhere with API contract.
    const mappedMessage: EditMessageResponseDto =
        mapToEditMessageResponseDto(editedMessage);

    // Create success response object adhering with API Contract.
    const successResponse: ApiResponse<EditMessageResponseDto> = {
        success: true,
        data: mappedMessage,
        requestId: req.requestId,
        statusCode: 200,
    };

    // Send success response.
    res.status(200).json(successResponse);
};
