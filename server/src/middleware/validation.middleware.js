import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';

export const validateRequiredFields = (fields) => {
  return (req, res, next) => {
    const missing = [];
    fields.forEach((field) => {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    });

    if (missing.length > 0) {
      return next(new ApiError(400, `Missing required fields: ${missing.join(', ')}`));
    }
    next();
  };
};

export const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName] || req.body[paramName];
    if (id && !mongoose.Types.ObjectId.isValid(id)) {
      return next(new ApiError(400, `Invalid ID format for ${paramName}`));
    }
    next();
  };
};

export const validateCoordinates = (req, res, next) => {
  const { latitude, longitude } = req.body;
  
  if (latitude !== undefined && (typeof latitude !== 'number' || latitude < -90 || latitude > 90)) {
    return next(new ApiError(400, 'Invalid latitude. Must be a number between -90 and 90.'));
  }
  
  if (longitude !== undefined && (typeof longitude !== 'number' || longitude < -180 || longitude > 180)) {
    return next(new ApiError(400, 'Invalid longitude. Must be a number between -180 and 180.'));
  }
  
  next();
};
