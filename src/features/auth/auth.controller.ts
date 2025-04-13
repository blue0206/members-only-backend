import { authService } from './auth.service.js';
import {
    ErrorCodes,
    LoginRequestSchema,
    RegisterRequestSchema,
} from '@blue0206/members-only-shared-types';
import { mapToLoginResponseDto, mapToRegisterResponseDto } from './auth.mapper.js';
import {
    InternalServerError,
    ValidationError,
} from '../../core/errors/customErrors.js';
import { config } from '../../core/config/index.js';
import ms from 'ms';
import crypto from 'crypto';
import type { CookieOptions, Request, Response } from 'express';
import type {
    ApiResponseSuccess,
    LoginRequestDto,
    LoginResponseDto,
    RegisterRequestDto,
    RegisterResponseDto,
} from '@blue0206/members-only-shared-types';
import type {
    LoginServiceReturnType,
    RegisterServiceReturnType,
} from './auth.types.js';
import type { StringValue } from 'ms';

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

    // Set common refresh token and csrf token cookie options.
    const commonCookieOptions: CookieOptions = {
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: ms(config.REFRESH_TOKEN_EXPIRY as StringValue),
    };
    // Send refresh token as cookie.
    res.cookie('refreshToken', userData.refreshToken, {
        httpOnly: true,
        path: '/api/v1/auth',
        ...commonCookieOptions,
    });
    // Generate CSRF token and send it as cookie.
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf-token', csrfToken, {
        // httpOnly is not set because we need JS access
        // to use double submit protection.
        path: '/',
        ...commonCookieOptions,
    });

    // Create success response object adhering with API Contract.
    const successResponse: ApiResponseSuccess<RegisterResponseDto> = {
        success: true,
        data: responseData,
        requestId: req.requestId,
        statusCode: 201,
    };

    // Send response.
    res.status(201).json(successResponse);
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
    // Throw error if request id is missing.
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }
    // Validate the incoming request to make sure it adheres to the
    // API contract (LoginRequestDto).
    const parsedBody = LoginRequestSchema.safeParse(req.body);
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
    const loginData: LoginRequestDto = parsedBody.data;

    // Pass the parsed DTO to the service layer.
    const userData: LoginServiceReturnType = await authService.login(loginData);

    // Map the data returned by the service layer to the LoginResponseDto to
    // adhere to API contract.
    const responseData: LoginResponseDto = mapToLoginResponseDto(userData);

    // Set common refresh token and csrf token cookie options.
    const commonCookieOptions: CookieOptions = {
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: ms(config.REFRESH_TOKEN_EXPIRY as StringValue),
    };
    // Send refresh token as cookie.
    res.cookie('refreshToken', userData.refreshToken, {
        httpOnly: true,
        path: '/api/v1/auth',
        ...commonCookieOptions,
    });
    // Generate CSRF token and send it as cookie.
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf-token', csrfToken, {
        path: '/',
        ...commonCookieOptions,
    });

    // Create success response object adhering with API Contract.
    const successResponse: ApiResponseSuccess<LoginResponseDto> = {
        success: true,
        data: responseData,
        requestId: req.requestId,
        statusCode: 200,
    };

    // Send response.
    res.status(200).json(successResponse);
};
