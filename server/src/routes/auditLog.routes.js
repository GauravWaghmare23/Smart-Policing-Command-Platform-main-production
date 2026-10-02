import express from 'express';
import * as auditLogController from '../controllers/auditLog.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  authorizeRoles(ROLES.CONTROL_ROOM_ADMIN, ROLES.STATION_HEAD, ROLES.INVESTIGATING_OFFICER),
  auditLogController.getAuditLogs
);

router.get(
  '/timeline/:resourceId',
  auditLogController.getCitizenTimeline
);

export default router;
