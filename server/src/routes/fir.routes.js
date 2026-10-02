import express from 'express';
import * as firController from '../controllers/fir.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { validateRequiredFields, validateObjectId } from '../middleware/validation.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  authorizeRoles(ROLES.INVESTIGATING_OFFICER, ROLES.STATION_HEAD, ROLES.CONTROL_ROOM_ADMIN),
  validateRequiredFields(['complaintId']),
  firController.createFIR
);

router.get('/', firController.getFIRs);
router.get('/:id', validateObjectId('id'), firController.getFIRById);

router.patch(
  '/:id/status',
  authorizeRoles(ROLES.INVESTIGATING_OFFICER, ROLES.STATION_HEAD, ROLES.CONTROL_ROOM_ADMIN),
  validateObjectId('id'),
  validateRequiredFields(['status']),
  firController.updateStatus
);

export default router;
