import { authService } from './auth.service.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import {
    mapToLoginResponseDto,
    mapToRefreshResponseDto,
    mapToRegisterResponseDto,
    mapToUserSessionsResponseDto,
} from './auth.mapper.js';
import {
    InternalServerError,
    UnauthorizedError,
} from '../../core/errors/customErrors.js';
import { config } from '../../core/config/index.js';
import ms from 'ms';
import crypto from 'crypto';
import type { CookieOptions, Request, Response } from 'express';
import type {
    ApiResponseSuccess,
    LoginRequestDto,
    LoginResponseDto,
    RefreshResponseDto,
    RegisterRequestDto,
    RegisterResponseDto,
    SessionIdParamsDto,
    UserSessionsResponseDto,
} from '@blue0206/members-only-shared-types';
import type {
    GetSessionsServiceReturnType,
    LoginServiceReturnType,
    RefreshServiceReturnType,
    RegisterServiceReturnType,
} from './auth.types.js';
import type { StringValue } from 'ms';

const setAuthCookies = (res: Response, refreshToken: string): void => {
    const commonCookieOptions: CookieOptions = {
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: ms(config.REFRESH_TOKEN_EXPIRY as StringValue),
    };
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        path: '/api/v1/auth',
        ...commonCookieOptions,
    });

    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf-token', csrfToken, {
        // httpOnly is not set because we need JS access
        // to use double submit protection.
        path: '/',
        ...commonCookieOptions,
    });
};

export const registerUser = async (
    req: Request<unknown, unknown, RegisterRequestDto>,
    res: Response
): Promise<void> => {
    if (!req.clientDetails) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Client Details'
        );
    }

    const userData: RegisterServiceReturnType = await authService.register(
        req.body,
        req.file ? req.file.buffer : undefined,
        req.clientDetails,
        req.log
    );
    const responseData: RegisterResponseDto = mapToRegisterResponseDto(userData);

    setAuthCookies(res, userData.refreshToken);

    const successResponse: ApiResponseSuccess<RegisterResponseDto> = {
        success: true,
        payload: responseData,
        requestId: req.requestId,
        statusCode: 201,
    };

    res.status(201).json(successResponse);
};

export const loginUser = async (
    req: Request<unknown, unknown, LoginRequestDto>,
    res: Response
): Promise<void> => {
    if (!req.clientDetails) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Client Details'
        );
    }

    const userData: LoginServiceReturnType = await authService.login(
        req.body,
        req.clientDetails,
        req.log
    );
    const responseData: LoginResponseDto = mapToLoginResponseDto(userData);

    setAuthCookies(res, userData.refreshToken);

    const successResponse: ApiResponseSuccess<LoginResponseDto> = {
        success: true,
        payload: responseData,
        requestId: req.requestId,
        statusCode: 200,
    };

    res.status(200).json(successResponse);
};

export const logoutUser = async (req: Request, res: Response): Promise<void> => {
    // In this route, we just log the error and not throw it to end execution flow.
    // This is because we would still want the user to be logged out because it makes things more
    // secure from security POV. Hence, we send a successful 204 response, clearing cookies with
    // refresh and CSRF tokens.
    // No matter the cause of error, be it a missing token or invalid token or a db error, it
    // would be best to log the user out.

    const refreshToken: string | undefined = req.cookies.refreshToken as
        | string
        | undefined;

    // We clear cookies in advance because we are going to send a success 204 for
    // this route even in case of errors.
    // To clear cookies, we set res.clearCookie with the SAME options provided when
    // creating them (excluding maxAge).
    // This was more trickier to figure out then expected.
    // https://expressjs.com/en/4x/api.html#res.clearCookie helped clear things out.
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
        req.log.warn('Logout request but refresh token was missing from request.');
        res.status(204).json();
        return;
    }

    try {
        await authService.logout(refreshToken, req.log);
    } catch (error: unknown) {
        req.log.error(
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

    res.status(204).end();
};

export const refreshUserTokens = async (
    req: Request,
    res: Response
): Promise<void> => {
    if (!req.clientDetails) {
        throw new InternalServerError(
            'Internal server configuration error: Missing Client Details'
        );
    }

    const refreshToken: string | undefined = req.cookies.refreshToken as
        | string
        | undefined;
    if (!refreshToken) {
        throw new UnauthorizedError(
            'Missing refresh token.',
            ErrorCodes.MISSING_REFRESH_TOKEN
        );
    }

    const tokens: RefreshServiceReturnType = await authService.refresh(
        refreshToken,
        req.clientDetails,
        req.log
    );
    const responseData: RefreshResponseDto = mapToRefreshResponseDto(tokens);

    setAuthCookies(res, tokens.refreshToken);

    const successResponse: ApiResponseSuccess<RefreshResponseDto> = {
        success: true,
        payload: responseData,
        statusCode: 200,
        requestId: req.requestId,
    };

    res.status(200).json(successResponse);
};

export const getSessions = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    const refreshToken: string | undefined = req.cookies.refreshToken as
        | string
        | undefined;
    if (!refreshToken) {
        throw new UnauthorizedError(
            'Missing refresh token.',
            ErrorCodes.MISSING_REFRESH_TOKEN
        );
    }

    const sessionData: GetSessionsServiceReturnType = await authService.getSessions(
        req.user.id,
        refreshToken,
        req.log
    );

    const responseData: UserSessionsResponseDto =
        mapToUserSessionsResponseDto(sessionData);

    const successResponse: ApiResponseSuccess<UserSessionsResponseDto> = {
        success: true,
        payload: responseData,
        statusCode: 200,
        requestId: req.requestId,
    };
    res.status(200).json(successResponse);
};

export const revokeSession = async (
    req: Request<SessionIdParamsDto>,
    res: Response
): Promise<void> => {
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    await authService.revokeSession(req.user.id, req.params.sessionId, req.log);

    res.status(204).end();
};

export const revokeAllOtherSessions = async (
    req: Request,
    res: Response
): Promise<void> => {
    if (!req.user) {
        throw new UnauthorizedError(
            'Authentication details missing.',
            ErrorCodes.AUTHENTICATION_REQUIRED
        );
    }

    const refreshToken: string | undefined = req.cookies.refreshToken as
        | string
        | undefined;
    if (!refreshToken) {
        throw new UnauthorizedError(
            'Missing refresh token.',
            ErrorCodes.MISSING_REFRESH_TOKEN
        );
    }

    await authService.revokeAllOtherSessions(req.user.id, refreshToken, req.log);

    res.status(204).end();
};
