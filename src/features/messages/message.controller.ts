import { messageService } from './message.service.js';
import { InternalServerError } from '../../core/errors/customErrors.js';
import type { Request, Response } from 'express';
import type { GetMessagesServiceReturnType } from './message.types.js';
import type {
    ApiResponse,
    GetMessagesResponseDto,
    GetMessagesWithoutAuthorResponseDto,
} from '@blue0206/members-only-shared-types';
import {
    mapToGetMessagesResponseDto,
    mapToGetMessagesWithoutAuthorResponseDto,
} from './message.mapper.js';

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
