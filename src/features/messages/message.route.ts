import { Router } from 'express';
import {
    createNewMessage,
    getMessagesWithAuthor,
    getMessagesWithoutAuthor,
} from './message.controller.js';
import accessTokenVerification from '../../core/middlewares/accessTokenVerification.js';
import csrfVerification from '../../core/middlewares/csrfVerification.js';
import memberVerification from '../../core/middlewares/memberVerification.js';

const messageRouter = Router();

// Get all messages (unregistered/user)
messageRouter.get('/public', getMessagesWithoutAuthor);

//-----------Protected Routes-----------
// Get all messages (Admin/Member)
messageRouter.get(
    '/',
    accessTokenVerification,
    memberVerification,
    getMessagesWithAuthor
);
// Create a new message.
messageRouter.post('/', accessTokenVerification, csrfVerification, createNewMessage);

export default messageRouter;
