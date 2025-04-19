import { Router } from 'express';
import {
    getMessagesWithAuthor,
    getMessagesWithoutAuthor,
} from './message.controller.js';
import accessTokenVerification from '../../core/middlewares/accessTokenVerification.js';

const messageRouter = Router();

// Get all messages (unregistered/user)
messageRouter.get('/public', getMessagesWithoutAuthor);

//-----------Protected Routes-----------
// Get all messages (Admin/Member)
messageRouter.get('/', accessTokenVerification, getMessagesWithAuthor);

export default messageRouter;
