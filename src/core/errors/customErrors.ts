import { ErrorCodes } from '@blue0206/members-only-shared-types';
import type { ApiErrorCode } from '@blue0206/members-only-shared-types';

// Base App Error class.
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: ApiErrorCode;
    public readonly details?: unknown;

    constructor(
        message: string,
        statusCode: number,
        code: ApiErrorCode,
        details?: unknown
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;

        // Maintain prototype chain and stack trace.
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);

        this.name = this.constructor.name;
    }
}

// Bad Request Error class.
export class BadRequestError extends AppError {
    constructor(
        message = 'Bad Request',
        code: ApiErrorCode = ErrorCodes.BAD_REQUEST,
        details?: unknown
    ) {
        super(message, 400, code, details);
        this.name = 'BadRequestError';
    }
}

// Not Found Error class.
export class NotFoundError extends AppError {
    constructor(
        message = 'Requested resource not found.',
        code: ApiErrorCode = ErrorCodes.NOT_FOUND,
        details?: unknown
    ) {
        super(message, 404, code, details);
        this.name = 'NotFoundError';
    }
}

// Conflict Error class.
export class ConflictError extends AppError {
    constructor(
        message = 'Resource conflict.',
        code: ApiErrorCode = ErrorCodes.CONFLICT,
        details?: unknown
    ) {
        super(message, 409, code, details);
        this.name = 'ConflictError';
    }
}

// Unauthorized Error class.
export class UnauthorizedError extends AppError {
    constructor(
        message = 'Unauthorized',
        code: ApiErrorCode = ErrorCodes.UNAUTHORIZED,
        details?: unknown
    ) {
        super(message, 401, code, details);
        this.name = 'UnauthorizedError';
    }
}

// Forbidden Error class.
export class ForbiddenError extends AppError {
    constructor(
        message = 'Forbidden',
        code: ApiErrorCode = ErrorCodes.FORBIDDEN,
        details?: unknown
    ) {
        super(message, 403, code, details);
        this.name = 'ForbiddenError';
    }
}

// Validation Error class.
export class ValidationError extends AppError {
    constructor(
        message = 'Validation Error',
        code: ApiErrorCode = ErrorCodes.VALIDATION_ERROR,
        details?: unknown
    ) {
        super(message, 421, code, details);
        this.name = 'ValidationError';
    }
}

// Internal Server Error class.
export class InternalServerError extends AppError {
    constructor(
        message = 'Internal Server Error',
        code: ApiErrorCode = ErrorCodes.INTERNAL_SERVER_ERROR,
        details?: unknown
    ) {
        super(message, 500, code, details);
        this.name = 'InternalServerError';
    }
}
