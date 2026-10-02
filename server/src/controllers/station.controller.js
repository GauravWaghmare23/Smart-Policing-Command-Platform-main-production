import * as stationService from '../services/station.service.js';
import { ApiResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

export const createStation = asyncHandler(async (req, res) => {
  const station = await stationService.createStation(req.body);
  return ApiResponse(res, 201, 'Police station created successfully', { station });
});

export const getStations = asyncHandler(async (req, res) => {
  const stations = await stationService.getStationsList(req.query);
  return ApiResponse(res, 200, 'Police stations retrieved successfully', { stations });
});

export const getStationById = asyncHandler(async (req, res) => {
  const station = await stationService.getStationDetails(req.params.id);
  return ApiResponse(res, 200, 'Police station retrieved successfully', { station });
});

export const updateStation = asyncHandler(async (req, res) => {
  const station = await stationService.updateStationDetails(req.params.id, req.body);
  return ApiResponse(res, 200, 'Police station updated successfully', { station });
});

export const deleteStation = asyncHandler(async (req, res) => {
  // Hackathon soft deactivate instead of physical deletion
  const station = await stationService.updateStationDetails(req.params.id, { status: 'INACTIVE' });
  return ApiResponse(res, 200, 'Police station deactivated successfully', { station });
});

export const changeStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) {
    throw new ApiError(400, 'Status field is required');
  }
  const station = await stationService.updateStationDetails(req.params.id, { status });
  return ApiResponse(res, 200, `Police station status updated to ${status}`, { station });
});

export const assignHead = asyncHandler(async (req, res) => {
  const { officerUserId } = req.body;
  if (!officerUserId) {
    throw new ApiError(400, 'officerUserId is required');
  }
  const station = await stationService.assignStationHead(req.params.id, officerUserId);
  return ApiResponse(res, 200, 'Station Head assigned successfully', { station });
});
