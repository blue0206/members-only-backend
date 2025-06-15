import { Router } from 'express';
import {
    createNewMessage,
    deleteMessage,
    editMessage,
    getMessagesWithAuthor,
    getMessagesWithoutAuthor,
    likeMessage,
    unlikeMessage,
} from './message.controller.js';
import accessTokenVerification from '../../core/middlewares/accessTokenVerification.js';
import csrfVerification from '../../core/middlewares/csrfVerification.js';
import memberVerification from '../../core/middlewares/memberVerification.js';
import lastActiveUpdateMiddleware from '../../core/middlewares/lastActiveUpdateMiddleware.js';

const messageRouter = Router();

// Get all messages (unregistered/user)
messageRouter.get('/public', getMessagesWithoutAuthor);

//-----------Protected Routes-----------
// Get all messages (Admin/Member)
messageRouter.get(
    '/',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    memberVerification,
    getMessagesWithAuthor
);

// Create a new message.
messageRouter.post(
    '/',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    csrfVerification,
    createNewMessage
);

// Edit message (Admin/Member)
messageRouter.patch(
    '/:messageId',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    csrfVerification,
    memberVerification,
    editMessage
);

// Delete message
messageRouter.delete(
    '/:messageId',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    csrfVerification,
    deleteMessage
);

// Like Message
messageRouter.post(
    '/:messageId/like',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    csrfVerification,
    memberVerification,
    likeMessage
);

// Unlike Message
messageRouter.delete(
    '/:messageId/like',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    csrfVerification,
    memberVerification,
    unlikeMessage
);

export default messageRouter;
