import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    throw new ApiError(401, 'Authentication token missing. Please log in.');
  }

  try {
    const decoded = jwt.verify(token, env.jwtAccessSecret);
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new ApiError(401, 'User not found or account deleted.');
    }
    if (user.status !== 'ACTIVE') {
      throw new ApiError(403, 'Your account is inactive or suspended.');
    }
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired access token. Please authenticate again.');
  }
});

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Access forbidden. Required role: one of [${roles.join(', ')}]. Current role: ${req.user ? req.user.role : 'none'}`
        )
      );
    }
    next();
  };
};
