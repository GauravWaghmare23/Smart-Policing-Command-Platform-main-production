import express from 'express';
import * as stationController from '../controllers/station.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { validateRequiredFields, validateObjectId } from '../middleware/validation.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  authorizeRoles(ROLES.CONTROL_ROOM_ADMIN),
  validateRequiredFields(['name', 'stationCode', 'address', 'phone', 'location']),
  stationController.createStation
);

router.get('/', stationController.getStations);
router.get('/:id', validateObjectId('id'), stationController.getStationById);

router.patch(
  '/:id',
  authorizeRoles(ROLES.CONTROL_ROOM_ADMIN),
  validateObjectId('id'),
  stationController.updateStation
);

router.delete(
  '/:id',
  authorizeRoles(ROLES.CONTROL_ROOM_ADMIN),
  validateObjectId('id'),
  stationController.deleteStation
);

router.patch(
  '/:id/status',
  authorizeRoles(ROLES.CONTROL_ROOM_ADMIN),
  validateObjectId('id'),
  validateRequiredFields(['status']),
  stationController.changeStatus
);

router.patch(
  '/:id/assign',
  authorizeRoles(ROLES.CONTROL_ROOM_ADMIN),
  validateObjectId('id'),
  validateRequiredFields(['officerUserId']),
  stationController.assignHead
);

export default router;
