import 'dotenv/config';
import { config } from '@members-only/core-utils/env';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import sseRouter from './sse.routes.js';
import { assignRequestIdAndChildLogger } from '@members-only/core-utils/middlewares/assignRequestIdAndChildLogger';
import { loggerMiddleware } from '@members-only/core-utils/middlewares/loggerMiddleware';
import { errorHandler } from '@members-only/core-utils/middlewares/errorHandler';
import { NotFoundError } from '@members-only/core-utils/errors';
import type { Request, Response } from 'express';

const app = express();

// Assign request id and child logger via middleware.
app.use(assignRequestIdAndChildLogger);
// Assign logger middleware for http logging.
app.use(loggerMiddleware);
// Cors Middleware
app.use(
    cors({
        credentials: true,
        origin: config.CORS_ORIGIN.split(','),
    })
);

// Middlewares
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/events', sseRouter);
// Healthcheck
app.use('/api/v1/events/healthcheck', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'sse-service' });
});
// Catch-all route.
app.use((req: Request, _res: Response) => {
    req.log.warn(
        { url: req.url, method: req.method },
        'Request received for non-existent route.'
    );
    throw new NotFoundError('This route does not exist.');
});

// Error Middleware
app.use(errorHandler);
