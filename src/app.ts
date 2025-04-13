import 'dotenv/config';
import { config } from './core/config/index.js';
import express from 'express';
import cors from 'cors';
import assignRequestId from './core/middlewares/assignRequestId.js';
import { loggerMiddleware } from './core/middlewares/loggerMiddleware.js';
import authRouter from './features/auth/auth.routes.js';
import userRouter from './features/users/user.route.js';
import messageRouter from './features/messages/message.route.js';
import { errorHandler } from './core/middlewares/errorHandler.js';

const app = express();
// Cors Middleware
app.use(cors());
// Assign request id via middleware.
app.use(assignRequestId);
// Assign logger middleware for http logging.
app.use(loggerMiddleware);

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/messages', messageRouter);

// Error Middleware
app.use(errorHandler);

// Server
const PORT = config.PORT;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT.toString()}`);
});
