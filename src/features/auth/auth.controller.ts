import { authService } from './auth.service.js';
import {
    ErrorCodes,
    LoginRequestSchema,
    RegisterRequestSchema,
} from '@blue0206/members-only-shared-types';
import {
    mapToLoginResponseDto,
    mapToRefreshResponseDto,
    mapToRegisterResponseDto,
} from './auth.mapper.js';
import {
    InternalServerError,
    UnauthorizedError,
    ValidationError,
} from '../../core/errors/customErrors.js';
import { config } from '../../core/config/index.js';
import ms from 'ms';
import crypto from 'crypto';
import { logger } from '../../core/logger.js';
import type { CookieOptions, Request, Response } from 'express';
import type {
    ApiResponseSuccess,
    LoginRequestDto,
    LoginResponseDto,
    RefreshResponseDto,
    RegisterRequestDto,
    RegisterResponseDto,
} from '@blue0206/members-only-shared-types';
import type {
    LoginServiceReturnType,
    RefreshServiceReturnType,
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

    // Pass the parsed DTO and the avatar buffer to the service layer.
    const userData: RegisterServiceReturnType = await authService.register(
        registerData,
        req.file?.buffer
    );

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

export const logoutUser = async (req: Request, res: Response): Promise<void> => {
    // In this route, we just log the error and not throw it to end execution flow.
    // This is because we would still want the user to be logged out because it makes things more
    // secure from security POV. Hence, we send a successful 204 response, clearing cookies with
    // refresh and CSRF tokens.
    // No matter the cause of error, be it a missing token or invalid token or a db error, it
    // would be best to log the user out.

    // Log error if request id is missing.
    if (!req.requestId) {
        logger.warn('Logout request but request id was missing from request.');
    }

    // Extract refresh token from cookie.
    const refreshToken: string | undefined = req.cookies.refreshToken as
        | string
        | undefined;

    // We clear cookies in advance because we are going to send a success 204 for
    // this route even in case of errors.
    // To clear cookies, we set res.clearCookie with the SAME options provided when
    // creating them (excluding maxAge). See https://expressjs.com/en/4x/api.html#res.clearCookie
    const commonCookieOptions: CookieOptions = {
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
    };
    res.clearCookie('refreshToken', {
        httpOnly: true,
        path: '/api/v1/auth',
        ...commonCookieOptions,
    });
    res.clearCookie('csrf-token', {
        path: '/',
        ...commonCookieOptions,
    });

    if (!refreshToken) {
        // Log the error if refresh token is missing but still send a success 204.
        logger.warn(
            { userId: req.user?.id },
            'Logout request but refresh token was missing from request.'
        );
        res.status(204).json();
        return;
    }

    // Wrap service call in try-catch to gracefully handle any errors without breaking
    // the execution flow and send a 204 response.
    try {
        await authService.logout(refreshToken);
    } catch (error: unknown) {
        // Log the error from service call. We do not let it pass forward.
        logger.error(
            {
                error,
                requestId: req.requestId,
                url: req.url,
                method: req.method,
                ip: req.ip,
            },
            (error as Error).message || 'An error occurred during logout process.'
        );
    }
    // Send a success response with 204.
    res.status(204).end();
};

export const refreshUserTokens = async (
    req: Request,
    res: Response
): Promise<void> => {
    // Throw error if request id is missing.
    if (!req.requestId) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Request ID'
        );
    }

    // Extract refresh token from cookie.
    const refreshToken: string | undefined = req.cookies.refreshToken as
        | string
        | undefined;

    // Throw error if refresh token is missing.
    if (!refreshToken) {
        throw new UnauthorizedError(
            'Missing refresh token.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    // Pass the refresh token to the service layer.
    const tokens: RefreshServiceReturnType = await authService.refresh(refreshToken);

    // Map the data returned by the service layer to the RefreshResponseDto to
    // adhere to API contract.
    const responseData: RefreshResponseDto = mapToRefreshResponseDto(tokens);

    // Set common cookie options.
    const commonCookieOptions: CookieOptions = {
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: ms(config.REFRESH_TOKEN_EXPIRY as StringValue),
    };

    // Send refresh token as cookie.
    res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        path: '/api/v1/auth',
        ...commonCookieOptions,
    });

    // Create CSRF token and send it as cookie.
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf-token', csrfToken, {
        path: '/',
        ...commonCookieOptions,
    });

    // Create success response object adhering with API Contract.
    const successResponse: ApiResponseSuccess<RefreshResponseDto> = {
        success: true,
        data: responseData,
        statusCode: 200,
        requestId: req.requestId,
    };

    // Send response.
    res.status(200).json(successResponse);
};
