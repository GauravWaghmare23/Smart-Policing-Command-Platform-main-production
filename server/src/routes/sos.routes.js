import express from 'express';
import * as sosController from '../controllers/sos.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateRequiredFields, validateObjectId, validateCoordinates } from '../middleware/validation.middleware.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';

const router = express.Router();

// Optional authentication for public triggering of SOS
const optionalAuthenticate = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }
    
    if (token) {
      const decoded = jwt.verify(token, env.jwtAccessSecret);
      const user = await User.findById(decoded.userId);
      if (user && user.status === 'ACTIVE') {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    next();
  }
};

router.post(
  '/',
  optionalAuthenticate,
  validateRequiredFields(['latitude', 'longitude']),
  validateCoordinates,
  sosController.triggerSOS
);

// All other SOS routes require authentication
router.use(authenticate);

router.get('/', sosController.getSOS);
router.get('/:id', validateObjectId('id'), sosController.getSOSById);

router.patch('/:id/acknowledge', validateObjectId('id'), sosController.acknowledge);
router.patch('/:id/reject', validateObjectId('id'), sosController.reject);
router.patch('/:id/dispatch', validateObjectId('id'), sosController.dispatch);
router.patch('/:id/en-route', validateObjectId('id'), sosController.markEnRoute);
router.patch('/:id/arrived', validateObjectId('id'), sosController.markArrived);
router.patch('/:id/resolve', validateObjectId('id'), sosController.resolve);
router.patch('/:id/escalate', validateObjectId('id'), sosController.escalate);

export default router;
