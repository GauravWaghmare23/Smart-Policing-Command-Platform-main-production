import * as sosService from '../services/sos.service.js';
import { ApiResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

export const triggerSOS = asyncHandler(async (req, res) => {
  const citizenId = req.user ? req.user._id : null;
  const sos = await sosService.triggerSOS(citizenId, req.body);
  return ApiResponse(res, 201, 'SOS Alert triggered successfully', { sos });
});

export const getSOS = asyncHandler(async (req, res) => {
  const filter = {};
  
  if (req.user.role === 'CITIZEN') {
    filter.citizenId = req.user._id;
  } else if (req.user.role === 'STATION_HEAD') {
    const PoliceOfficer = await import('../models/PoliceOfficer.js');
    const officer = await PoliceOfficer.default.findOne({ userId: req.user._id });
    if (officer && officer.stationId) {
      filter.nearestStationId = officer.stationId;
    }
  } else if (req.user.role === 'FIELD_OFFICER' || req.user.role === 'INVESTIGATING_OFFICER') {
    filter.assignedOfficerId = req.user._id;
  }
  
  const sosList = await sosService.getSOSList(filter);
  return ApiResponse(res, 200, 'SOS Alerts retrieved successfully', { sosList });
});

export const getSOSById = asyncHandler(async (req, res) => {
  const sos = await sosService.getSOSDetails(req.params.id);
  return ApiResponse(res, 200, 'SOS Alert details retrieved successfully', { sos });
});

export const acknowledge = asyncHandler(async (req, res) => {
  const officerUserId = req.user._id;
  const sos = await sosService.acknowledgeSOS(req.params.id, officerUserId);
  return ApiResponse(res, 200, 'SOS Alert acknowledged', { sos });
});

export const reject = asyncHandler(async (req, res) => {
  const officerUserId = req.user._id;
  const { reason } = req.body;
  const sos = await sosService.rejectSOS(req.params.id, officerUserId, reason);
  return ApiResponse(res, 200, 'SOS Alert rejected and re-dispatched', { sos });
});

export const dispatch = asyncHandler(async (req, res) => {
  const { officerUserId, isPersonalResponse, dispatchNote } = req.body;
  const sos = await sosService.dispatchSOS(
    req.params.id,
    officerUserId,
    req.user,
    { isPersonalResponse: Boolean(isPersonalResponse), dispatchNote }
  );
  return ApiResponse(res, 200, 'SOS dispatched successfully', { sos });
});

export const markEnRoute = asyncHandler(async (req, res) => {
  const sos = await sosService.markEnRoute(req.params.id, req.user._id);
  return ApiResponse(res, 200, 'Officer en route to SOS incident', { sos });
});

export const markArrived = asyncHandler(async (req, res) => {
  const sos = await sosService.markArrived(req.params.id, req.user._id);
  return ApiResponse(res, 200, 'Officer arrival confirmed at SOS location', { sos });
});

export const resolve = asyncHandler(async (req, res) => {
  const { summary } = req.body;
  const sos = await sosService.resolveSOS(req.params.id, summary);
  return ApiResponse(res, 200, 'SOS Alert marked as resolved', { sos });
});

export const escalate = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const sos = await sosService.escalateSOS(req.params.id, reason);
  return ApiResponse(res, 200, 'SOS Alert escalated', { sos });
});
