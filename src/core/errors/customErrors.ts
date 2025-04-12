import type { ApiErrorCode } from "@blue0206/members-only-shared-types";
import { ErrorCodes } from "@blue0206/members-only-shared-types";

// Base App Error class.
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ApiErrorCode;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number,
    code: ApiErrorCode,
    details?: unknown,
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
  constructor(message = "Bad Request", details?: unknown) {
    super(message, 400, ErrorCodes.BAD_REQUEST, details);
    this.name = "BadRequestError";
  }
}

// Not Found Error class.
export class NotFoundError extends AppError {
  constructor(message = "Requested resource not found.", details?: unknown) {
    super(message, 404, ErrorCodes.NOT_FOUND, details);
    this.name = "NotFoundError";
  }
}
