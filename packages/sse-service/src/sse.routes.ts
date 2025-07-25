import { Router } from 'express';
import { dispatchEvent, sseConnectionHandler } from './sse.controller.js';
import {
    sseClientCleanup,
    requestValidatorWrapper,
    verifyInternalApiSecret,
} from './sse.middleware.js';
import {
    EventRequestQuerySchema,
    EventRequestSchema,
} from '@blue0206/members-only-shared-types/dtos/event.dto';
import type { Router as ExpressRouter } from 'express';

const sseRouter: ExpressRouter = Router();

sseRouter.get('/healthcheck', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'sse-service' });
});

sseRouter.get(
    '/',
    sseClientCleanup,
    requestValidatorWrapper({
        schema: EventRequestQuerySchema,
        type: 'query',
    }),
    sseConnectionHandler
);

sseRouter.post(
    '/internal/dispatch',
    verifyInternalApiSecret,
    requestValidatorWrapper({ schema: EventRequestSchema, type: 'body' }),
    dispatchEvent
);

export default sseRouter;
