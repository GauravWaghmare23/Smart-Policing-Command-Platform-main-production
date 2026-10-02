import express from 'express';
import * as aiAssistantController from '../controllers/aiAssistant.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.post('/case-brief', aiAssistantController.getCaseBriefing);

export default router;
