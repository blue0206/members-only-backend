import { v4 as uuidv4 } from 'uuid';
import type { Request, Response, NextFunction } from 'express';

// This middleware assigns a uuidv4 to every request and
// passes it forward.
export default function assignRequestId(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    req.requestId = uuidv4();
    next();
}
