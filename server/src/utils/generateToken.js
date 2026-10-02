import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role
    },
    env.jwtAccessSecret,
    {
      expiresIn: env.jwtAccessExpiresIn
    }
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user._id
    },
    env.jwtRefreshSecret,
    {
      expiresIn: env.jwtRefreshExpiresIn
    }
  );
};
