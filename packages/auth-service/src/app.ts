import 'dotenv/config';
import express from 'express';
import authRouter from './auth.routes.js';
import cookieParser from 'cookie-parser';
import { assignRequestIdAndChildLogger } from '@members-only/core-utils/middlewares/assignRequestIdAndChildLogger';
import { loggerMiddleware } from '@members-only/core-utils/middlewares/loggerMiddleware';
import { errorHandler } from '@members-only/core-utils/middlewares/errorHandler';
import { NotFoundError } from '@members-only/core-utils/errors';
import type { Request, Response, Application } from 'express';

const app: Application = express();

// Trust proxy to ensure accurate IP address resolution behind API Gateway.
app.set('trust proxy', true);
// Assign request id and child logger via middleware.
app.use(assignRequestIdAndChildLogger);
// Assign logger middleware for http logging.
app.use(loggerMiddleware);

// Setup cookie-parser for parsing cookies.
app.use(cookieParser());

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1); // Trust proxy to ensure accurate IP address resolution when behind a proxy.

// Routes
app.use('/api/v1/auth', authRouter);
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
