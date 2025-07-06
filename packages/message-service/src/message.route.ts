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
import {
    accessTokenVerification,
    csrfVerification,
    memberVerification,
    lastActiveUpdateMiddleware,
    requestValidator,
} from '@members-only/core-utils';
import {
    CreateMessageRequestSchema,
    EditMessageRequestSchema,
    MessageParamsSchema,
} from '@blue0206/members-only-shared-types';
import type { Router as ExpressRouter } from 'express';

const messageRouter: ExpressRouter = Router();

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
    csrfVerification,
    memberVerification,
    lastActiveUpdateMiddleware,
    requestValidator({ schema: MessageParamsSchema, type: 'params' }),
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
    requestValidator(
        { schema: EditMessageRequestSchema, type: 'body' },
        { schema: MessageParamsSchema, type: 'params' }
    ),
    editMessage
);

// Unlike Message
messageRouter.delete(
    '/:messageId/like',
    accessTokenVerification,
    csrfVerification,
    memberVerification,
    lastActiveUpdateMiddleware,
    requestValidator({ schema: MessageParamsSchema, type: 'params' }),
    unlikeMessage
);

// Delete message
messageRouter.delete(
    '/:messageId',
    accessTokenVerification,
    csrfVerification,
    lastActiveUpdateMiddleware,
    requestValidator({ schema: MessageParamsSchema, type: 'params' }),
    deleteMessage
);

export default messageRouter;
