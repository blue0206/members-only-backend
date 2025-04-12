import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

export default function assignRequestId(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  req.requestId = uuidv4();
  next();
}
