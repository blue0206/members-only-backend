import { logger } from '@members-only/core-utils/logger';
import serverlessExpress from '@codegenie/serverless-express';
import app from './app.js';
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught Exception in Auth Service.');
});
process.on('unhandledRejection', (reason, promise) => {
    logger.fatal({ err: reason, promise }, 'Unhandled Rejection in Auth Service.');
});

export const handler: APIGatewayProxyHandlerV2 = serverlessExpress.configure({
    app,
});
