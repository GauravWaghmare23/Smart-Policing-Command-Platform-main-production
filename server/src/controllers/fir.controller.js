import * as firService from '../services/fir.service.js';
import { ApiResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

export const createFIR = asyncHandler(async (req, res) => {
  const { complaintId } = req.body;
  if (!complaintId) {
    throw new ApiError(400, 'complaintId is required');
  }
  
  // Investigating officer user ID is the logged-in user
  const investigatingOfficerId = req.user._id;
  const fir = await firService.registerFIR(complaintId, investigatingOfficerId);
  return ApiResponse(res, 201, 'FIR registered successfully', { fir });
});

export const getFIRs = asyncHandler(async (req, res) => {
  const filter = {};
  
  if (req.user.role === 'CITIZEN') {
    filter.citizenId = req.user._id;
  } else if (req.user.role === 'STATION_HEAD') {
    const PoliceOfficer = await import('../models/PoliceOfficer.js');
    const officer = await PoliceOfficer.default.findOne({ userId: req.user._id });
    if (officer && officer.stationId) {
      filter.policeStationId = officer.stationId;
    } else {
      filter.policeStationId = null;
    }
  } else if (req.user.role === 'INVESTIGATING_OFFICER') {
    filter.investigatingOfficerId = req.user._id;
  }
  
  const firs = await firService.getFIRsList(filter);
  return ApiResponse(res, 200, 'FIRs retrieved successfully', { firs });
});

export const getFIRById = asyncHandler(async (req, res) => {
  const fir = await firService.getFIRDetails(req.params.id);
  
  if (req.user.role === 'CITIZEN' && fir.citizenId._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied. You cannot view this FIR record.');
  }
  
  return ApiResponse(res, 200, 'FIR record retrieved successfully', { fir });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) {
    throw new ApiError(400, 'status is required');
  }
  const fir = await firService.updateFIRStatus(req.params.id, status);
  return ApiResponse(res, 200, 'FIR status updated successfully', { fir });
});
