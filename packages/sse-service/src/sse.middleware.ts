import { sseService } from './sse.service.js';
import { requestValidator } from '@members-only/core-utils/middlewares/requestValidator';
import type { RequestValidatorArgsType } from '@members-only/core-utils/middlewares/requestValidator';
import type { Request, Response, NextFunction } from 'express';

// Middleware to cleanup SSE clients.
export function sseClientCleanup(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    let isConcluded = false;

    const cleanup = (): void => {
        res.off('finish', onResFinish);
        req.off('aborted', onReqAborted);
        req.off('close', onReqClose);
    };

    // Called when response has been successfully sent.
    const onResFinish = (): void => {
        if (isConcluded) return;
        isConcluded = true;
        cleanup();

        req.log.info('Response finished. Disconnecting Client.');
        sseService.removeClient(req.requestId);
    };

    // Called when request is aborted.
    const onReqAborted = (): void => {
        if (isConcluded) return;
        isConcluded = true;
        cleanup();

        req.log.info('Request aborted. Removing client.');
        sseService.removeClient(req.requestId);
    };

    // Called when response is completed, or the underlying connection was terminated prematurely.
    // This serves as a defensive check in case either of the other two listeners fail.
    const onReqClose = (): void => {
        if (isConcluded) return;
        isConcluded = true;
        cleanup();

        if (!res.writableEnded) {
            req.log.info(
                'Connection CLOSED prematurely. Possible abort. Removing client.'
            );
        } else {
            req.log.info('Response completed. Removing client.');
        }

        sseService.removeClient(req.requestId);
    };

    res.on('finish', onResFinish);
    req.on('aborted', onReqAborted);
    req.on('close', onReqClose);

    next();
}

// A wrapper middleware over requestValidator middleware to catch error and just log it and return a
// success 204 response if the request was initially for dispatching event, or throw the error otherwise.
export const requestValidatorWrapper =
    (...args: RequestValidatorArgsType) =>
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await requestValidator(...args)(req, res, next);
        } catch (error) {
            req.log.error({ error }, 'Request validation failed in SSE.');

            if (req.url !== '/') {
                res.status(204).end();
            } else {
                throw error;
            }
        }
    };
