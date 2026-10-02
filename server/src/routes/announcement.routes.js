import express from 'express';
import * as announcementController from '../controllers/announcement.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { validateRequiredFields, validateObjectId } from '../middleware/validation.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

// Public routes
router.get('/', announcementController.getAnnouncements);
router.get('/:id', validateObjectId('id'), announcementController.getAnnouncementById);

// Protected routes (Admin / Station Head)
router.use(authenticate);

router.post(
  '/',
  authorizeRoles(ROLES.CONTROL_ROOM_ADMIN, ROLES.STATION_HEAD),
  validateRequiredFields(['title', 'message', 'targetAreaName']),
  announcementController.createAnnouncement
);

router.patch(
  '/:id',
  authorizeRoles(ROLES.CONTROL_ROOM_ADMIN, ROLES.STATION_HEAD),
  validateObjectId('id'),
  announcementController.updateAnnouncement
);

router.delete(
  '/:id',
  authorizeRoles(ROLES.CONTROL_ROOM_ADMIN, ROLES.STATION_HEAD),
  validateObjectId('id'),
  announcementController.deleteAnnouncement
);

export default router;
