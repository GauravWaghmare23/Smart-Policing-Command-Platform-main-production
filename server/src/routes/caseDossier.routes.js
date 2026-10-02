import express from 'express';
import * as dossierController from '../controllers/caseDossier.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/search', dossierController.searchCases);
router.get('/dossier/:id', dossierController.getCaseDossier);

export default router;
