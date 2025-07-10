import 'dotenv/config';
import express from 'express';
import { assignRequestIdAndChildLogger } from '@members-only/core-utils/middlewares/assignRequestIdAndChildLogger';
import { loggerMiddleware } from '@members-only/core-utils/middlewares/loggerMiddleware';
import { errorHandler } from '@members-only/core-utils/middlewares/errorHandler';
import { NotFoundError } from '@members-only/core-utils/errors';
import userRouter from './user.route.js';
import cookieParser from 'cookie-parser';
import type { Request, Response, Application } from 'express';

const app: Application = express();

// Assign request id and child logger via middleware.
app.use(assignRequestIdAndChildLogger);
// Assign logger middleware for http logging.
app.use(loggerMiddleware);
// Cors Middleware

// Setup cookie-parser for parsing cookies.
app.use(cookieParser());

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/users', userRouter);
// Healthcheck
app.use('/api/v1/users/healthcheck', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'user-service' });
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

export default app;
