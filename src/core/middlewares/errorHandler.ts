import { config } from '../config/index.js';
import { logger } from '../logger.js';
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
    // Log error.
    logger.error(
        {
            err,
            requestId: req.requestId,
            url: req.url,
            method: req.method,
            ip: req.ip,
        },
        err.message || 'An error occurred in the error middleware.'
    );
    // Prepare error payload as per API contract.
    const ErrorPayload: ApiErrorPayload = {
        message: err.message,
        code: ErrorCodes.INTERNAL_SERVER_ERROR,
        statusCode: 500,
    };
    // If error is an instance of AppError, update error payload.
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
    // Return api response for error.
    const ErrorResponse: ApiResponseError = {
        error: ErrorPayload,
        requestId: req.requestId,
        success: false,
    };
    res.status(ErrorPayload.statusCode).json(ErrorResponse);
};
