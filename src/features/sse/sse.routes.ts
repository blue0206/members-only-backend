import { Router } from 'express';
import { sseConnectionHandler } from './sse.controller.js';
import sseClientCleanup from '../../core/middlewares/sseClientCleanup.js';
import requestValidator from '../../core/middlewares/requestValidator.js';
import { EventRequestQuerySchema } from '@blue0206/members-only-shared-types';

const sseRouter = Router();

sseRouter.get(
    '/',
    sseClientCleanup,
    requestValidator({ schema: EventRequestQuerySchema, type: 'query' }),
    sseConnectionHandler
);

export default sseRouter;
