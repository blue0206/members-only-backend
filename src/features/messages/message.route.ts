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
import requestValidator from '../../core/middlewares/requestValidator.js';
import {
    CreateMessageRequestSchema,
    EditMessageRequestSchema,
} from '@blue0206/members-only-shared-types';

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

// Like Message
messageRouter.post(
    '/:messageId/like',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    csrfVerification,
    memberVerification,
    likeMessage
);

// Create a new message.
messageRouter.post(
    '/',
    accessTokenVerification,
    csrfVerification,
    lastActiveUpdateMiddleware,
    requestValidator({ schema: CreateMessageRequestSchema, type: 'body' }),
    createNewMessage
);

// Edit message (Admin/Member)
messageRouter.patch(
    '/:messageId',
    accessTokenVerification,
    csrfVerification,
    memberVerification,
    lastActiveUpdateMiddleware,
    requestValidator({ schema: EditMessageRequestSchema, type: 'body' }),
    editMessage
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

// Delete message
messageRouter.delete(
    '/:messageId',
    accessTokenVerification,
    lastActiveUpdateMiddleware,
    csrfVerification,
    deleteMessage
);

export default messageRouter;
