import type { Request, Response, NextFunction } from 'express';

export const requestDurationMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        req.log.info(
            { duration, status: res.statusCode, path: req.path, method: req.method },
            'Request completed.'
        );
    });
    next();
};
