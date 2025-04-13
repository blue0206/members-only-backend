import { v4 as uuidv4 } from 'uuid';
import type { Request, Response, NextFunction } from 'express';

export default function assignRequestId(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    req.requestId = uuidv4();
    next();
}
