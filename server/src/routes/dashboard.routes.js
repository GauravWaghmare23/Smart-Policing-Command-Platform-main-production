import express from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(authenticate);

router.get(
  '/admin',
  authorizeRoles(ROLES.CONTROL_ROOM_ADMIN),
  dashboardController.getAdminDashboard
);

router.get(
  '/station',
  authorizeRoles(ROLES.STATION_HEAD),
  dashboardController.getStationDashboard
);

router.get(
  '/officer',
  authorizeRoles(ROLES.STATION_HEAD, ROLES.INVESTIGATING_OFFICER, ROLES.FIELD_OFFICER),
  dashboardController.getOfficerDashboard
);

router.get(
  '/citizen',
  authorizeRoles(ROLES.CITIZEN),
  dashboardController.getCitizenDashboard
);

export default router;
