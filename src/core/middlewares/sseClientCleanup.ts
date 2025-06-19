import type { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';
import { sseService } from '../../features/sse/sse.service.js';

export default function sseClientCleanup(
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

        logger.info('Response finished. Disconnecting Client.');
        sseService.removeClient(req.requestId ?? '');
    };

    // Called when request is aborted.
    const onReqAborted = (): void => {
        if (isConcluded) return;
        isConcluded = true;
        cleanup();

        logger.info('Request aborted. Removing client.');
        sseService.removeClient(req.requestId ?? '');
    };

    // Called when response is completed, or the underlying connection was terminated prematurely.
    // This serves as a defensive check in case either of the other two listeners fail.
    const onReqClose = (): void => {
        if (isConcluded) return;
        isConcluded = true;
        cleanup();

        if (!res.writableEnded) {
            logger.info(
                'Connection CLOSED prematurely. Possible abort. Removing client.'
            );
        } else {
            logger.info('Response completed. Removing client.');
        }

        sseService.removeClient(req.requestId ?? '');
    };

    res.on('finish', onResFinish);
    req.on('aborted', onReqAborted);
    req.on('close', onReqClose);

    next();
}
