import { pinoHttp } from 'pino-http';
import { logger } from '../logger.js';

export const loggerMiddleware = pinoHttp({
    logger,
});
