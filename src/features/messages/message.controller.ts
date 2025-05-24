import { messageService } from './message.service.js';
import {
    InternalServerError,
    UnauthorizedError,
    ValidationError,
} from '../../core/errors/customErrors.js';
import {
    CreateMessageRequestSchema,
    MessageParamsSchema,
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
    MessageParamsDto,
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
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }

    const messages: GetMessagesServiceReturnType =
        await messageService.getMessages();

    const mappedMessages: GetMessagesWithoutAuthorResponseDto =
        mapToGetMessagesWithoutAuthorResponseDto(messages);

    const successResponse: ApiResponse<GetMessagesWithoutAuthorResponseDto> = {
        success: true,
        payload: mappedMessages,
        requestId: req.requestId,
        statusCode: 200,
    };

    res.status(200).json(successResponse);
};

export const getMessagesWithAuthor = async (
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

    const messages: GetMessagesServiceReturnType =
        await messageService.getMessages();

    const mappedMessages: GetMessagesResponseDto =
        mapToGetMessagesResponseDto(messages);

    const successResponse: ApiResponse<GetMessagesResponseDto> = {
        success: true,
        payload: mappedMessages,
        requestId: req.requestId,
        statusCode: 200,
    };

    res.status(200).json(successResponse);
};

export const createNewMessage = async (
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

    // Validate the incoming request to make sure it adheres to the
    // API contract (CreateMessageRequestDto).
    const parsedBody = CreateMessageRequestSchema.safeParse(req.body);
    if (!parsedBody.success) {
        throw new ValidationError(
            'Invalid request body.',
            ErrorCodes.VALIDATION_ERROR,
            parsedBody.error.flatten()
        );
    }
    const newMessageContent: CreateMessageRequestDto = parsedBody.data;

    const createdMessage: CreateMessageServiceReturnType =
        await messageService.createMessage(newMessageContent.message, req.user.id);

    const mappedCreatedMessage: CreateMessageResponseDto =
        mapToCreateMessageResponseDto(createdMessage);

    const successResponse: ApiResponse<CreateMessageResponseDto> = {
        success: true,
        payload: mappedCreatedMessage,
        requestId: req.requestId,
        statusCode: 201,
    };

    res.status(201).json(successResponse);
};

export const editMessage = async (req: Request, res: Response): Promise<void> => {
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

    // Validate the incoming request to make sure it adheres to the
    // API contract (EditMessageRequestDto and MessageParamsDto).
    const parsedBody = EditMessageRequestSchema.safeParse(req.body);
    const parsedParams = MessageParamsSchema.safeParse(req.params);
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
    const messageEditData: EditMessageRequestDto = parsedBody.data;
    const messageParams: MessageParamsDto = parsedParams.data;

    const editedMessage: EditMessageServiceReturnType =
        await messageService.editMessage(
            messageEditData.newMessage,
            messageParams.messageId,
            req.user
        );

    const mappedMessage: EditMessageResponseDto =
        mapToEditMessageResponseDto(editedMessage);

    const successResponse: ApiResponse<EditMessageResponseDto> = {
        success: true,
        payload: mappedMessage,
        requestId: req.requestId,
        statusCode: 200,
    };

    res.status(200).json(successResponse);
};

export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
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

    // Validate the incoming request to make sure it adheres to the
    // API contract (MessageParamsDto).
    const parsedParams = MessageParamsSchema.safeParse(req.params);

    if (!parsedParams.success) {
        throw new ValidationError(
            'Invalid request params.',
            ErrorCodes.VALIDATION_ERROR,
            parsedParams.error.flatten()
        );
    }

    const deleteData: MessageParamsDto = parsedParams.data;

    await messageService.deleteMessage(deleteData.messageId, req.user);

    res.status(204).end();
};
