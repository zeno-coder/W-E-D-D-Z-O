import express from 'express';
import { signatureController } from '../controllers/mediaController.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errors.js';

export const mediaRouter = express.Router();

mediaRouter.post('/signature', requireAuth, asyncHandler(signatureController));
