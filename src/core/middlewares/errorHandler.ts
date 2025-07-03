import { config } from '../config/index.js';
import { AppError } from '../errors/customErrors.js';
import { ErrorCodes } from '@blue0206/members-only-shared-types';
import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import type {
    ApiErrorPayload,
    ApiResponseError,
} from '@blue0206/members-only-shared-types';

export const errorHandler: ErrorRequestHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    req.log.error(
        {
            err,
            requestId: req.requestId,
            url: req.url,
            method: req.method,
            ip: req.ip,
        },
        err.message || 'An error occurred in the error middleware.'
    );

    const ErrorPayload: ApiErrorPayload = {
        message: err.message,
        code: ErrorCodes.INTERNAL_SERVER_ERROR,
        statusCode: 500,
    };

    if (err instanceof AppError) {
        ErrorPayload.message = err.message;
        ErrorPayload.code = err.code;
        ErrorPayload.statusCode = err.statusCode;
        ErrorPayload.details = err.details;
    }

    // Sanitize errors before sending response in production.
    if (config.NODE_ENV === 'production' && ErrorPayload.statusCode >= 500) {
        ErrorPayload.message = 'Internal Server Error';
        delete ErrorPayload.details;
    }

    const ErrorResponse: ApiResponseError = {
        errorPayload: ErrorPayload,
        requestId: req.requestId,
        success: false,
    };
    res.status(ErrorPayload.statusCode).json(ErrorResponse);
};
