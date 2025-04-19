import { Router } from 'express';
import { getMessagesWithoutAuthor } from './message.controller.js';

const messageRouter = Router();

messageRouter.get('/public', getMessagesWithoutAuthor); // Get all messages (unregistered/user)

export default messageRouter;
