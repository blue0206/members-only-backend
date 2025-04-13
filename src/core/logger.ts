import { pino } from 'pino';
import { config } from './config/index.js';
import type { LoggerOptions } from 'pino';

const level =
    config.LOG_LEVEL || config.NODE_ENV === 'development' ? 'debug' : 'info';

const pinoOptions: LoggerOptions = { level };

if (config.NODE_ENV === 'development') {
    pinoOptions.transport = {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        },
    };
}

export const logger = pino(pinoOptions);

logger.info(`Logger initialized with level: ${level}`);
