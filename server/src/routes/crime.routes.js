import express from 'express';
import * as crimeController from '../controllers/crime.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/hotspots', crimeController.getHotspots);
router.get('/statistics', crimeController.getStatistics);

export default router;
