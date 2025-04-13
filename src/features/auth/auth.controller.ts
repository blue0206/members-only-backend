import { authService } from './auth.service.js';
import {
    ErrorCodes,
    RegisterRequestSchema,
} from '@blue0206/members-only-shared-types';
import { mapToRegisterResponseDto } from './auth.mapper.js';
import {
    InternalServerError,
    ValidationError,
} from '../../core/errors/customErrors.js';
import type { Request, Response } from 'express';
import type {
    ApiResponseSuccess,
    RegisterRequestDto,
    RegisterResponseDto,
} from '@blue0206/members-only-shared-types';
import type { RegisterServiceReturnType } from './auth.types.js';

export const registerUser = async (req: Request, res: Response): Promise<void> => {
    // Throw error if request id is missing.
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }

    // Validate the incoming request to make sure it adheres to the
    // API contract (RegisterRequestDto).
    const parsedBody = RegisterRequestSchema.safeParse(req.body);
    // Throw Error if validation fails.
    if (!parsedBody.success) {
        throw new ValidationError(
            'Invalid request body.',
            ErrorCodes.VALIDATION_ERROR,
            parsedBody.error.flatten()
        );
    }
    // Extract the RegisterRequestDto object from the parsedBody
    // and pass it to the service layer.
    const registerData: RegisterRequestDto = parsedBody.data;

    // Pass the parsed DTO to the service layer.
    const userData: RegisterServiceReturnType =
        await authService.register(registerData);

    // Map the data returned by the service layer to the RegisterResponseDto
    // to adhere to API contract.
    const responseData: RegisterResponseDto = mapToRegisterResponseDto(userData);

    // Return response.
    const successResponse: ApiResponseSuccess<RegisterResponseDto> = {
        success: true,
        data: responseData,
        requestId: req.requestId,
        statusCode: 201,
    };
    res.status(201).json(successResponse);
};
