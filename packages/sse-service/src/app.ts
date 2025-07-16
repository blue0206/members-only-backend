import 'dotenv/config';
import { config } from '@members-only/core-utils/env';
import express from 'express';
import cors from 'cors';
import sseRouter from './sse.routes.js';
import { assignRequestIdAndChildLogger } from '@members-only/core-utils/middlewares/assignRequestIdAndChildLogger';
import { loggerMiddleware } from '@members-only/core-utils/middlewares/loggerMiddleware';
import { errorHandler } from '@members-only/core-utils/middlewares/errorHandler';
import { NotFoundError } from '@members-only/core-utils/errors';
import { logger } from '@members-only/core-utils/logger';
import { sseService } from './sse.service.js';
import type { Request, Response } from 'express';
import type { Server } from 'http';
import { publisher } from './core/redis.js';
import { subscriberService } from './core/subscriber.js';

const app = express();

// Trust proxy to ensure accurate IP address resolution when behind Nginx.
app.set('trust proxy', 1);
// Assign request id and child logger via middleware.
app.use(assignRequestIdAndChildLogger('sse-service'));
// Assign logger middleware for http logging.
app.use(loggerMiddleware);
// Cors Middleware
app.use(
    cors({
        credentials: true,
        origin: 'https://cloud.nevery.shop',
    })
);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/events', sseRouter);
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

// Server
const PORT = config.PORT;
const server: Server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(
        `Server running on port ${config.PORT.toString()} in ${config.NODE_ENV} mode`
    );

    // Schedule heartbeat to send to all SSE clients every 35 seconds.
    setInterval(() => {
        sseService.sendHeartbeat();
    }, 35000);
    logger.info('Scheduled heartbeat to send to all SSE clients every 35 seconds.');
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

    // Disconnect all SSE clients before shutting down.
    sseService.clearSseClients();

    // Stop server.
    server.close(async (err) => {
        if (err) {
            logger.error({ err }, 'Error shutting down server.');
            // Set exit code to indicate failure. But we don't exit yet
            // here because we want to try disconnecting the DB.
            process.exitCode = 1;
        } else {
            logger.info('Server has shutdown successfully.');
        }

        // Disconnect redis publisher instance.
        await publisher.quit();

        // Disconnect redis subscriber service.
        await subscriberService.disconnect();

        // Exit the process.
        logger.info('Graceful shutdown complete. Exiting....');
        // We don't set exitCode here. By default it should be 0, else 1 if error
        // was encountered before.
        process.exit();
    });

    // Failsafe Timeout
    const shutDownTimeout = 11000;
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
