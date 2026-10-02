import express from 'express';
import * as suspectController from '../controllers/suspect.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(authenticate);

// Restricted to Police & Control Room Admin
router.use(authorizeRoles(ROLES.CONTROL_ROOM_ADMIN, ROLES.STATION_HEAD, ROLES.INVESTIGATING_OFFICER, ROLES.FIELD_OFFICER));

router.route('/')
  .post(suspectController.createSuspect)
  .get(suspectController.getSuspects);

router.route('/:id')
  .get(suspectController.getSuspectById)
  .patch(suspectController.updateSuspect);

export default router;
