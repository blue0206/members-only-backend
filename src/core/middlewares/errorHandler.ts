import type {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from "express";

export const errorHandler: ErrorRequestHandler = (
  error: Error,
  _req: Request,
  _res: Response,
  _next: NextFunction,
): void => {
  console.error(error);
};
