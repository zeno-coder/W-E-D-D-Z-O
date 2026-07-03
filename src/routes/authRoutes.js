import express from 'express';
import { loginController, logoutController, meController, signupController } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errors.js';
import { authLimiter } from '../middleware/security.js';

export const authRouter = express.Router();

authRouter.post('/signup', authLimiter, asyncHandler(signupController));
authRouter.post('/login', authLimiter, asyncHandler(loginController));
authRouter.post('/logout', requireAuth, asyncHandler(logoutController));
authRouter.get('/me', requireAuth, asyncHandler(meController));
