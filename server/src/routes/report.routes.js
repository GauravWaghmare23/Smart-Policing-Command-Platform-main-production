import express from 'express';
import * as reportController from '../controllers/report.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { validateRequiredFields, validateObjectId } from '../middleware/validation.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(authenticate);

router.post(
  '/daily/generate',
  authorizeRoles(ROLES.CONTROL_ROOM_ADMIN, ROLES.STATION_HEAD),
  validateRequiredFields(['date']),
  reportController.generateDailyReport
);

router.get('/daily', reportController.getDailyReports);
router.get('/daily/:id', validateObjectId('id'), reportController.getDailyReportById);

export default router;
