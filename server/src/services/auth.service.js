import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken.js';
import { ROLES, USER_STATUS } from '../utils/constants.js';

export const registerCitizen = async (userData) => {
  const { name, email, phone, password } = userData;
  
  // Force CITIZEN role
  const citizen = await User.create({
    name,
    email,
    phone,
    password,
    role: ROLES.CITIZEN,
    status: USER_STATUS.ACTIVE
  });
  
  // Exclude password from the returned object
  const userObject = citizen.toObject();
  delete userObject.password;
  
  return userObject;
};

export const loginUser = async (email, password) => {
  const user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }
  
  if (user.status !== USER_STATUS.ACTIVE) {
    throw new ApiError(403, 'Your account is inactive or suspended');
  }
  
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }
  
  user.lastLoginAt = new Date();
  await user.save();
  
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  
  const userObject = user.toObject();
  delete userObject.password;
  
  return {
    user: userObject,
    accessToken,
    refreshToken
  };
};

export const refreshUserToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token missing');
  }
  
  // Import jsonwebtoken dynamically or at the top
  const jwt = await import('jsonwebtoken');
  const { env } = await import('../config/env.js');
  
  try {
    const decoded = jwt.default.verify(refreshToken, env.jwtRefreshSecret);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      throw new ApiError(401, 'Invalid refresh token');
    }
    
    if (user.status !== USER_STATUS.ACTIVE) {
      throw new ApiError(403, 'User is inactive or suspended');
    }
    
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
};
