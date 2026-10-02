import express from 'express';
import * as complaintController from '../controllers/complaint.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { validateRequiredFields, validateObjectId, validateCoordinates } from '../middleware/validation.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  authorizeRoles(ROLES.CITIZEN),
  validateRequiredFields(['title', 'description', 'latitude', 'longitude', 'address', 'crimeType']),
  validateCoordinates,
  complaintController.createComplaint
);

router.get('/', complaintController.getComplaints);
router.get('/:id', validateObjectId('id'), complaintController.getComplaintById);

router.patch(
  '/:id/status',
  authorizeRoles(ROLES.CONTROL_ROOM_ADMIN, ROLES.STATION_HEAD, ROLES.INVESTIGATING_OFFICER),
  validateObjectId('id'),
  validateRequiredFields(['status']),
  complaintController.updateStatus
);

router.patch(
  '/:id/assign',
  authorizeRoles(ROLES.CONTROL_ROOM_ADMIN, ROLES.STATION_HEAD),
  validateObjectId('id'),
  validateRequiredFields(['officerUserId']),
  complaintController.assignOfficer
);

router.post(
  '/:id/evidence',
  validateObjectId('id'),
  upload.single('evidence'),
  complaintController.uploadEvidence
);

router.post(
  '/:id/updates',
  authorizeRoles(ROLES.CONTROL_ROOM_ADMIN, ROLES.STATION_HEAD, ROLES.INVESTIGATING_OFFICER, ROLES.FIELD_OFFICER),
  validateObjectId('id'),
  complaintController.addCaseUpdate
);

router.post(
  '/:id/resolve',
  authorizeRoles(ROLES.CONTROL_ROOM_ADMIN, ROLES.STATION_HEAD, ROLES.INVESTIGATING_OFFICER),
  validateObjectId('id'),
  complaintController.resolveCase
);

export default router;
