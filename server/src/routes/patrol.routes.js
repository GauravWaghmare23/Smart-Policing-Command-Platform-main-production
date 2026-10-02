import express from 'express';
import * as patrolController from '../controllers/patrol.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { validateRequiredFields, validateObjectId } from '../middleware/validation.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(authenticate);

router.post(
  '/generate',
  authorizeRoles(ROLES.CONTROL_ROOM_ADMIN, ROLES.STATION_HEAD),
  patrolController.generatePatrol
);

router.get('/', patrolController.getPatrols);

router.patch(
  '/:id/status',
  validateObjectId('id'),
  validateRequiredFields(['status']),
  patrolController.updateStatus
);

router.post(
  '/:id/track',
  validateObjectId('id'),
  validateRequiredFields(['latitude', 'longitude']),
  patrolController.addBreadcrumb
);

router.post(
  '/route',
  validateRequiredFields(['origin', 'waypoints']),
  patrolController.getRouteDirections
);

export default router;
