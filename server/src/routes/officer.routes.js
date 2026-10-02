import express from 'express';
import * as officerController from '../controllers/officer.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { validateRequiredFields, validateObjectId, validateCoordinates } from '../middleware/validation.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  authorizeRoles(ROLES.CONTROL_ROOM_ADMIN),
  validateRequiredFields(['name', 'email', 'phone', 'password', 'badgeNumber', 'rank', 'role']),
  officerController.createOfficer
);

router.get('/', officerController.getOfficers);

// Officer dynamic GPS self-update endpoint
router.patch(
  '/me/location',
  validateCoordinates,
  officerController.updateMyLocation
);

router.get('/:id', validateObjectId('id'), officerController.getOfficerById);
router.get('/:id/full-profile', validateObjectId('id'), officerController.getOfficerFullProfile);

router.patch(
  '/:id',
  authorizeRoles(ROLES.CONTROL_ROOM_ADMIN),
  validateObjectId('id'),
  officerController.updateOfficer
);

router.patch(
  '/:id/transfer',
  authorizeRoles(ROLES.CONTROL_ROOM_ADMIN),
  validateObjectId('id'),
  validateRequiredFields(['stationId']),
  officerController.transferOfficer
);

router.patch(
  '/:id/assign',
  authorizeRoles(ROLES.CONTROL_ROOM_ADMIN),
  validateObjectId('id'),
  validateRequiredFields(['stationId']),
  officerController.transferOfficer // Reuses transfer service internally to assign station
);

router.patch(
  '/:id/status',
  validateObjectId('id'),
  validateRequiredFields(['dutyStatus']),
  officerController.updateStatus
);

router.patch(
  '/:id/location',
  validateObjectId('id'),
  validateCoordinates,
  officerController.updateLocation
);

export default router;
