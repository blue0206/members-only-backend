import { Router } from 'express';
import { sseConnectionHandler } from './sse.controller.js';
import sseClientCleanup from '../../core/middlewares/sseClientCleanup.js';

const sseRouter = Router();

sseRouter.get('/', sseClientCleanup, sseConnectionHandler);

export default sseRouter;
