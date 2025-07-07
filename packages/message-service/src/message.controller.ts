import { messageService } from './message.service.js';
import { UnauthorizedError } from '@members-only/core-utils/errors';
import { ErrorCodes } from '@blue0206/members-only-shared-types/api/error-codes';
import {
    mapToCreateMessageResponseDto,
    mapToEditMessageResponseDto,
    mapToMessagesWithAuthorResponseDto,
    mapToMessagesWithoutAuthorResponseDto,
} from './message.mapper.js';
import type { Request, Response } from 'express';
import type {
    ApiResponse,
    ApiResponseSuccess,
} from '@blue0206/members-only-shared-types/api/base';
import type {
    GetMessagesResponseDto,
    GetMessagesWithoutAuthorResponseDto,
    CreateMessageRequestDto,
    CreateMessageResponseDto,
    EditMessageRequestDto,
    EditMessageResponseDto,
    MessageParamsDto,
} from '@blue0206/members-only-shared-types/dtos/message.dto';
import type {
    CreateMessageServiceReturnType,
    EditMessageServiceReturnType,
    GetMessagesServiceReturnType,
} from './message.types.js';

export const getMessagesWithoutAuthor = async (
    req: Request,
    res: Response
): Promise<void> => {
    const messages: GetMessagesServiceReturnType = await messageService.getMessages(
        req.log
    );

    const mappedMessages: GetMessagesWithoutAuthorResponseDto =
        mapToMessagesWithoutAuthorResponseDto(messages);

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
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    const messages: GetMessagesServiceReturnType = await messageService.getMessages(
        req.log
    );

    const mappedMessages: GetMessagesResponseDto =
        mapToMessagesWithAuthorResponseDto(messages, req.user.id);

    const successResponse: ApiResponse<GetMessagesResponseDto> = {
        success: true,
        payload: mappedMessages,
        requestId: req.requestId,
        statusCode: 200,
    };

    res.status(200).json(successResponse);
};

export const createNewMessage = async (
    req: Request<unknown, unknown, CreateMessageRequestDto>,
    res: Response
): Promise<void> => {
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    const createdMessage: CreateMessageServiceReturnType =
        await messageService.createMessage(req.body.message, req.user.id, req.log);

    const mappedCreatedMessage: CreateMessageResponseDto =
        mapToCreateMessageResponseDto(createdMessage, req.user.id);

    const successResponse: ApiResponse<CreateMessageResponseDto> = {
        success: true,
        payload: mappedCreatedMessage,
        requestId: req.requestId,
        statusCode: 201,
    };

    res.status(201).json(successResponse);
};

export const editMessage = async (
    req: Request<unknown, unknown, EditMessageRequestDto>,
    res: Response
): Promise<void> => {
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    const editedMessage: EditMessageServiceReturnType =
        await messageService.editMessage(
            req.body.newMessage,
            parseInt(
                (req.params as MessageParamsDto).messageId as unknown as string
            ),
            req.user,
            req.log
        );

    const mappedMessage: EditMessageResponseDto = mapToEditMessageResponseDto(
        editedMessage,
        req.user.id
    );

    const successResponse: ApiResponse<EditMessageResponseDto> = {
        success: true,
        payload: mappedMessage,
        requestId: req.requestId,
        statusCode: 200,
    };

    res.status(200).json(successResponse);
};

export const deleteMessage = async (
    req: Request<unknown>,
    res: Response
): Promise<void> => {
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    await messageService.deleteMessage(
        parseInt((req.params as MessageParamsDto).messageId as unknown as string),
        req.user,
        req.log
    );

    res.status(204).end();
};

export const likeMessage = async (
    req: Request<unknown>,
    res: Response
): Promise<void> => {
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    await messageService.likeMessage(
        parseInt((req.params as MessageParamsDto).messageId as unknown as string),
        req.user.id,
        req.log
    );

    const successResponse: ApiResponseSuccess<null> = {
        success: true,
        payload: null,
        requestId: req.requestId,
        statusCode: 201,
    };

    res.status(201).json(successResponse);
};

export const unlikeMessage = async (
    req: Request<unknown>,
    res: Response
): Promise<void> => {
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    await messageService.unlikeMessage(
        parseInt((req.params as MessageParamsDto).messageId as unknown as string),
        req.user.id,
        req.log
    );

    res.status(204).end();
};
