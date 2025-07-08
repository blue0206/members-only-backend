import { Router } from 'express';
import { sseConnectionHandler } from './sse.controller.js';
import sseClientCleanup from './sseClientCleanup.middleware.js';
import { requestValidator } from '@members-only/core-utils/middlewares/requestValidator';
import { EventRequestQuerySchema } from '@blue0206/members-only-shared-types/dtos/event.dto';
import type { Router as ExpressRouter } from 'express';

const sseRouter: ExpressRouter = Router();

sseRouter.get(
    '/',
    sseClientCleanup,
    requestValidator({ schema: EventRequestQuerySchema, type: 'query' }),
    sseConnectionHandler
);

export default sseRouter;
