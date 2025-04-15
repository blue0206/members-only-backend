import { Router } from 'express';
import { loginUser, registerUser, logoutUser } from './auth.controller.js';
import accessTokenVerification from '../../core/middlewares/accessTokenVerification.js';
import csrfVerification from '../../core/middlewares/csrfVerification.js';

const authRouter = Router();

authRouter.post('/register', registerUser);
authRouter.post('/login', loginUser);

// Protected routes.
authRouter.delete('/logout', accessTokenVerification, csrfVerification, logoutUser);
authRouter.post('/refresh', csrfVerification);

export default authRouter;
