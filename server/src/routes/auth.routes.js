import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateRequiredFields } from '../middleware/validation.middleware.js';

const router = express.Router();

router.post(
  '/register',
  validateRequiredFields(['name', 'email', 'phone', 'password']),
  authController.register
);

router.post(
  '/login',
  validateRequiredFields(['email', 'password']),
  authController.login
);

router.post('/logout', authController.logout);

router.post('/refresh', authController.refresh);

router.get('/me', authenticate, authController.getMe);
router.get('/profile', authenticate, authController.getCitizenProfile);
router.get('/citizens/:id/profile', authenticate, authController.getCitizenProfile);

export default router;
