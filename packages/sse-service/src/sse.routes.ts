import { Router } from 'express';
import { dispatchEvent, sseConnectionHandler } from './sse.controller.js';
import { sseClientCleanup, requestValidatorWrapper } from './sse.middleware.js';
import {
    EventRequestQuerySchema,
    EventRequestSchema,
} from '@blue0206/members-only-shared-types/dtos/event.dto';
import type { Router as ExpressRouter } from 'express';

const sseRouter: ExpressRouter = Router();

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
    requestValidatorWrapper({ schema: EventRequestSchema, type: 'body' }),
    dispatchEvent
);

export default sseRouter;
