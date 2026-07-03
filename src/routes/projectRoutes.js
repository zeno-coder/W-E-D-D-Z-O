import express from 'express';
import { createProjectController, deleteProjectController, downloadProjectController, listProjectsController, templatesController } from '../controllers/projectController.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errors.js';

export const projectRouter = express.Router();

projectRouter.get('/templates', asyncHandler(templatesController));
projectRouter.get('/projects', requireAuth, asyncHandler(listProjectsController));
projectRouter.post('/projects', requireAuth, asyncHandler(createProjectController));
projectRouter.get('/projects/:id/download', requireAuth, asyncHandler(downloadProjectController));
projectRouter.delete('/projects/:id', requireAuth, asyncHandler(deleteProjectController));
