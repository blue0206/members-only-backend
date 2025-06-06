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

// Edit message (Admin/Member)
messageRouter.patch(
    '/:messageId',
    accessTokenVerification,
    csrfVerification,
    memberVerification,
    editMessage
);

// Delete message
messageRouter.delete(
    '/:messageId',
    accessTokenVerification,
    csrfVerification,
    deleteMessage
);

// Like Message
messageRouter.post(
    '/:messageId/like',
    accessTokenVerification,
    csrfVerification,
    memberVerification,
    likeMessage
);

// Unlike Message
messageRouter.delete(
    '/:messageId/like',
    accessTokenVerification,
    csrfVerification,
    memberVerification,
    unlikeMessage
);

export default messageRouter;
