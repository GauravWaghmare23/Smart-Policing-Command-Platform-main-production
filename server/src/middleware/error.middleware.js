import ApiError from '../utils/ApiError.js';
import { env } from '../config/env.js';

export const errorMiddleware = (err, req, res, next) => {
  let error = err;

  // If the error is not an instance of ApiError, convert it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
    const message = error.message || 'Something went wrong on the server';
    
    // Mongoose duplicate key error
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyValue)[0];
      const customMessage = `${duplicateField.charAt(0).toUpperCase() + duplicateField.slice(1)} already exists.`;
      error = new ApiError(400, customMessage);
    } else {
      error = new ApiError(
        statusCode,
        message,
        error.errors ? Object.values(error.errors).map(el => el.message) : []
      );
    }
  }

  // Format error response
  const response = {
    success: false,
    message: error.message,
    errors: error.errors || []
  };

  // Include stack trace in development
  if (env.nodeEnv === 'development') {
    response.stack = err.stack;
  }

  res.status(error.statusCode || 500).json(response);
};
