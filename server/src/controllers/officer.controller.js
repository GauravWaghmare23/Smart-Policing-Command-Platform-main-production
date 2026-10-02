import * as officerService from '../services/officer.service.js';
import { ApiResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { sendRealtimeEvent } from '../sockets/socket.js';

export const createOfficer = asyncHandler(async (req, res) => {
  const result = await officerService.createOfficerProfile(req.body);
  return ApiResponse(res, 201, 'Police officer created successfully', result);
});

export const getOfficers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.stationId) filter.stationId = req.query.stationId;
  if (req.query.role) filter.role = req.query.role;
  if (req.query.dutyStatus) filter.dutyStatus = req.query.dutyStatus;
  
  const officers = await officerService.getOfficersList(filter);
  return ApiResponse(res, 200, 'Officers retrieved successfully', { officers });
});

export const getOfficerById = asyncHandler(async (req, res) => {
  const officer = await officerService.getOfficerDetails(req.params.id);
  return ApiResponse(res, 200, 'Officer profile retrieved successfully', { officer });
});

export const getOfficerFullProfile = asyncHandler(async (req, res) => {
  const { getFullOfficerProfile } = await import('../services/officerProfile.service.js');
  const { logAudit } = await import('../middleware/auditLog.middleware.js');

  const profileData = await getFullOfficerProfile(req.params.id);

  await logAudit({
    userId: req.user._id,
    userName: req.user.name,
    userRole: req.user.role,
    action: 'VIEW_OFFICER_PROFILE',
    resourceType: 'Officer',
    resourceId: req.params.id,
    details: `Viewed detailed profile and case history of Officer ${profileData.officer?.userId?.name}`
  });

  return ApiResponse(res, 200, 'Full officer profile and analytics compiled successfully', { profile: profileData });
});

export const updateOfficer = asyncHandler(async (req, res) => {
  // Can modify rank, role, status
  const officer = await officerService.getOfficerDetails(req.params.id);
  const user = officer.userId;
  
  if (req.body.name) user.name = req.body.name;
  if (req.body.phone) user.phone = req.body.phone;
  if (req.body.status) user.status = req.body.status;
  await user.save();
  
  if (req.body.rank) officer.rank = req.body.rank;
  if (req.body.role) officer.role = req.body.role;
  if (req.body.dutyStatus) officer.dutyStatus = req.body.dutyStatus;
  await officer.save();
  
  return ApiResponse(res, 200, 'Officer profile updated successfully', { officer });
});

export const transferOfficer = asyncHandler(async (req, res) => {
  const { stationId } = req.body;
  if (!stationId) {
    throw new ApiError(400, 'stationId is required for transfer');
  }
  const officer = await officerService.transferOfficer(req.params.id, stationId);
  return ApiResponse(res, 200, 'Officer transferred successfully', { officer });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { dutyStatus } = req.body;
  if (!dutyStatus) {
    throw new ApiError(400, 'dutyStatus is required');
  }
  
  // Use officer userId to lookup and update
  const officerUserId = req.params.id; // Either profile ID or User ID. Let's lookup via userId
  const officer = await officerService.updateOfficerStatus(officerUserId, dutyStatus);
  return ApiResponse(res, 200, 'Officer duty status updated successfully', { officer });
});

export const updateMyLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude, isSimulated } = req.body;
  if (latitude === undefined || longitude === undefined) {
    throw new ApiError(400, 'latitude and longitude are required');
  }

  const officerUserId = req.user._id;
  const officer = await officerService.updateOfficerLocation(
    officerUserId,
    latitude,
    longitude,
    Boolean(isSimulated)
  );

  const officerName = officer.userId?.name || req.user.name || 'Officer';
  const stationId = officer.stationId?._id || officer.stationId;

  // Emit realtime location event
  const locationPayload = {
    officerId: officer._id,
    userId: officerUserId,
    name: officerName,
    badgeNumber: officer.badgeNumber,
    dutyStatus: officer.dutyStatus,
    currentLocation: officer.currentLocation,
    lastLocationUpdate: officer.lastLocationUpdate,
    isSimulated: officer.currentLocation?.isSimulated || false,
    station: officer.stationId ? {
      _id: stationId,
      name: officer.stationId.name,
      stationCode: officer.stationId.stationCode
    } : null
  };

  sendRealtimeEvent('control-room', 'officer:location', locationPayload);
  if (stationId) {
    sendRealtimeEvent(`station:${stationId}`, 'officer:location', locationPayload);
  }

  return ApiResponse(res, 200, 'Officer location updated successfully', { officer });
});

export const updateLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude, isSimulated } = req.body;
  if (latitude === undefined || longitude === undefined) {
    throw new ApiError(400, 'latitude and longitude are required');
  }
  
  const officerUserId = req.params.id;
  const officer = await officerService.updateOfficerLocation(
    officerUserId,
    latitude,
    longitude,
    Boolean(isSimulated)
  );
  
  const officerName = officer.userId?.name || 'Officer';
  const stationId = officer.stationId?._id || officer.stationId;

  // Emit realtime location
  const locationPayload = {
    officerId: officer._id,
    userId: officerUserId,
    name: officerName,
    badgeNumber: officer.badgeNumber,
    dutyStatus: officer.dutyStatus,
    currentLocation: officer.currentLocation,
    lastLocationUpdate: officer.lastLocationUpdate,
    isSimulated: officer.currentLocation?.isSimulated || false,
    station: officer.stationId ? {
      _id: stationId,
      name: officer.stationId.name,
      stationCode: officer.stationId.stationCode
    } : null
  };

  sendRealtimeEvent('control-room', 'officer:location', locationPayload);
  if (stationId) {
    sendRealtimeEvent(`station:${stationId}`, 'officer:location', locationPayload);
  }
  
  return ApiResponse(res, 200, 'Officer location updated successfully', { officer });
});
