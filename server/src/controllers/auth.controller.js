import * as authService from '../services/auth.service.js';
import { ApiResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

const isProd = process.env.NODE_ENV === 'production';

// In production the web app and API live on different origins (two onrender.com
// subdomains), so the refresh cookie must be SameSite=None; Secure to be sent on
// cross-site XHR. In development (localhost) Strict is kept.
const refreshCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'strict'
};

export const register = asyncHandler(async (req, res) => {
  const user = await authService.registerCitizen(req.body);
  return ApiResponse(res, 201, 'Citizen registered successfully', { user });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.loginUser(email, password);
  
  // Set refresh token in httpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    ...refreshCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
  
  return ApiResponse(res, 200, 'Logged in successfully', { user, accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('refreshToken', refreshCookieOptions);
  return ApiResponse(res, 200, 'Logged out successfully');
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  const { accessToken, refreshToken: newRefreshToken } = await authService.refreshUserToken(token);
  
  res.cookie('refreshToken', newRefreshToken, {
    ...refreshCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  
  return ApiResponse(res, 200, 'Tokens refreshed successfully', { accessToken });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = req.user.toObject();
  delete user.password;
  return ApiResponse(res, 200, 'User profile fetched successfully', { user });
});

export const getCitizenProfile = asyncHandler(async (req, res) => {
  const { getCitizenProfile } = await import('../services/citizenProfile.service.js');
  const { logAudit } = await import('../middleware/auditLog.middleware.js');

  const targetUserId = req.params.id || req.user._id;

  // Security Check: CITIZEN can only view their own profile
  if (req.user.role === 'CITIZEN' && req.user._id.toString() !== targetUserId.toString()) {
    throw new (await import('../utils/ApiError.js')).default(403, 'Forbidden. You can only view your own profile.');
  }

  const profileData = await getCitizenProfile(targetUserId);

  if (req.user._id.toString() !== targetUserId.toString()) {
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'VIEW_CITIZEN_PROFILE',
      resourceType: 'User',
      resourceId: targetUserId,
      details: `Viewed citizen profile and complaint history for ${profileData.citizen?.name}`
    });
  }

  return ApiResponse(res, 200, 'Citizen profile compiled successfully', { profile: profileData });
});
