import 'dotenv/config';
import { config } from '@members-only/core-utils';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import messageRouter from './message.route.js';
import cookieParser from 'cookie-parser';
import {
    assignRequestIdAndChildLogger,
    loggerMiddleware,
    errorHandler,
    NotFoundError,
} from '@members-only/core-utils';
import type { Request, Response, Application } from 'express';

const app: Application = express();

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

// Setup cookie-parser for parsing cookies.
app.use(cookieParser());

// Middlewares
app.use(helmet());
app.use(express.json());

// Routes
app.use('/api/v1/messages', messageRouter);
// Healthcheck
app.use('/api/v1/messages/healthcheck', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'message-service' });
});
// Catch-all route.
app.use((req: Request, _res: Response) => {
    req.log.warn('Request received for non-existent route.');
    throw new NotFoundError('This route does not exist.');
});

// Error Middleware
app.use(errorHandler);

export default app;
