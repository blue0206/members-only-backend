import 'dotenv/config';
import { config } from './core/config/index.js';
import express from 'express';
import cors from 'cors';
import assignRequestId from './core/middlewares/assignRequestId.js';
import { loggerMiddleware } from './core/middlewares/loggerMiddleware.js';
import helmet from 'helmet';
import authRouter from './features/auth/auth.routes.js';
import userRouter from './features/users/user.route.js';
import messageRouter from './features/messages/message.route.js';
import { errorHandler } from './core/middlewares/errorHandler.js';
import { logger } from './core/logger.js';
import { prisma } from './core/db/prisma.js';
import cookieParser from 'cookie-parser';
import { NotFoundError } from './core/errors/customErrors.js';
import {
    clearExpiredRefreshTokensTask,
    lastActiveDataFlushTask,
} from './core/scheduler/index.js';
import type { Server } from 'http';
import type { Request, Response } from 'express';

const app = express();
// Cors Middleware
app.use(
    cors({
        credentials: true,
        origin: ['http://localhost:5173'],
    })
);
// Assign request id via middleware.
app.use(assignRequestId);
// Assign logger middleware for http logging.
app.use(loggerMiddleware);
// Setup cookie-parser for parsing cookies.
app.use(cookieParser());

// Middlewares
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/messages', messageRouter);
// Catch-all route.
app.use((_req: Request, _res: Response) => {
    throw new NotFoundError('This route does not exist.');
});

// Error Middleware
app.use(errorHandler);

// Server
const PORT = config.PORT;
const server: Server = app.listen(PORT, () => {
    logger.info(
        `Server running on port ${config.PORT.toString()} in ${config.NODE_ENV} mode`
    );
    logger.info('Prisma client initialized.');

    // Start the scheduled task to clear expired refresh tokens.
    void clearExpiredRefreshTokensTask.start();
    logger.info(
        'Scheduled "Clear_Expired_Refresh_Tokens" task to run every day at 00:00 or 12:00 AM'
    );
    // Start the scheduled task to flush user activity data into DB.
    void lastActiveDataFlushTask.start();
    logger.info(`Scheduled "User_Activity_Batch_Update" task to run every hour.`);
});

//---------GRACEFUL SHUTDOWN--------

// Signals to listen for.
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
let shuttingDown = false;

// eslint-disable-next-line @typescript-eslint/require-await
async function gracefulShutdown(signal: NodeJS.Signals): Promise<void> {
    // Set flag to prevent multiple shutdown calls.
    if (shuttingDown) {
        logger.warn(`Already shutting down. Ignoring signal: ${signal}`);
        return;
    }
    shuttingDown = true;
    logger.warn(`Received ${signal}. Gracefully shutting down....`);

    // 1. Stop server.
    server.close(async (err) => {
        if (err) {
            logger.error({ err }, 'Error shutting down server.');
            // Set exit code to indicate failure. But we don't exit yet
            // here because we want to try disconnecting the DB.
            process.exitCode = 1;
        } else {
            logger.info('Server has shutdown successfully.');
        }

        // 2. Flush user activity data into DB so as to not lose the data while shutting down
        // as it is in memory.
        try {
            await lastActiveDataFlushTask.execute();
            logger.info(
                'Scheduled task "User_Activity_Batch_Update" has been executed in graceful shutdown.'
            );
        } catch (error) {
            logger.error(
                { err: error },
                'Error flushing user activity data into DB in graceful shutdown.'
            );
            process.exitCode = 1;
        }

        // 3. Stop node cron job to flush user activity data. Doesn't throw any errors, but wrapped in
        // try-catch just in case.
        try {
            await lastActiveDataFlushTask.stop();
            logger.info(
                'Scheduled task "User_Activity_Batch_Update" has been stopped.'
            );
        } catch (error) {
            logger.error(
                { err: error },
                'Error stopping scheduled task to flush user activity data.'
            );
            process.exitCode = 1;
        }

        // 4. Stop node cron job to clear expired tokens. Doesn't throw any errors, but wrapped in
        // try-catch just in case.
        try {
            await clearExpiredRefreshTokensTask.stop();
            logger.info(
                'Scheduled task "Clear_Expired_Refresh_Tokens" has been stopped.'
            );
        } catch (error) {
            logger.error(
                { err: error },
                'Error stopping scheduled task to clear expired tokens from DB.'
            );
            process.exitCode = 1;
        }

        // 5. Close the DB connection pool.
        logger.info('Disconnecting Prisma Client....');
        try {
            await prisma.$disconnect();
            logger.info('Prisma Client disconnected successfully.');
        } catch (error) {
            logger.error({ err: error }, 'Error disconnecting Prisma Client.');
            process.exitCode = 1;
        }

        // 6. Exit the process.
        logger.info('Graceful shutdown complete. Exiting....');
        // We don't set exitCode here. By default it should be 0, else 1 if errors
        // were encountered before.
        process.exit();
    });

    // Failsafe Timeout
    // This timeout forces exit if server takes too long to shutdown.
    const shutDownTimeout = 16000;
    setTimeout(() => {
        logger.error(
            `Graceful shutdown timed out after ${(shutDownTimeout / 1000).toString()}s. Forcing exit....`
        );
        process.exit(1);
    }, shutDownTimeout).unref(); // Allow exit on pending timeout.
}

// Register Signal Handlers
signals.forEach((signal: NodeJS.Signals) => {
    process.on(signal, async () => {
        console.log(`Received ${signal}. Gracefully shutting down....`);
        await gracefulShutdown(signal);
    });
});

// Uncaught Exceptions / Unhandled Rejections
process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught Exception');
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger.fatal({ err: reason, promise }, 'Unhandled Rejection');
    process.exit(1);
});
