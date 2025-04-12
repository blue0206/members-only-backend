import type { ApiErrorCode } from "@blue0206/members-only-shared-types";

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
