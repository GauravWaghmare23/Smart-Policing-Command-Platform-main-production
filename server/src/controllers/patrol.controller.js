import * as patrolService from '../services/patrol.service.js';
import * as mapsService from '../services/maps.service.js';
import Patrol from '../models/Patrol.js';
import { ApiResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

export const generatePatrol = asyncHandler(async (req, res) => {
  let { stationId } = req.body;
  
  if (req.user.role === 'STATION_HEAD') {
    const PoliceOfficer = await import('../models/PoliceOfficer.js');
    const officer = await PoliceOfficer.default.findOne({ userId: req.user._id });
    if (officer) {
      stationId = officer.stationId;
    }
  }
  
  if (!stationId) {
    throw new ApiError(400, 'stationId is required');
  }
  
  const patrol = await patrolService.generatePatrolPlan(stationId, req.user._id);
  return ApiResponse(res, 201, 'Patrol plan generated successfully', { patrol });
});

export const getPatrols = asyncHandler(async (req, res) => {
  const filter = {};
  
  if (req.user.role === 'STATION_HEAD') {
    const PoliceOfficer = await import('../models/PoliceOfficer.js');
    const officer = await PoliceOfficer.default.findOne({ userId: req.user._id });
    if (officer && officer.stationId) {
      filter.stationId = officer.stationId;
    }
  } else if (req.user.role === 'FIELD_OFFICER') {
    filter.officerIds = req.user._id;
  }
  
  const patrols = await Patrol.find(filter)
    .populate('stationId', 'name stationCode')
    .populate('officerIds', 'name email phone badgeNumber')
    .sort({ createdAt: -1 });
    
  return ApiResponse(res, 200, 'Patrol routes retrieved successfully', { patrols });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) {
    throw new ApiError(400, 'status is required');
  }
  const patrol = await patrolService.updatePatrolStatus(req.params.id, status, req.user);
  return ApiResponse(res, 200, 'Patrol status updated successfully', { patrol });
});

export const addBreadcrumb = asyncHandler(async (req, res) => {
  const { latitude, longitude, accuracy } = req.body;
  if (latitude == null || longitude == null) {
    throw new ApiError(400, 'latitude and longitude are required');
  }
  const result = await patrolService.addPatrolBreadcrumb(req.params.id, { latitude, longitude, accuracy });
  return ApiResponse(res, 200, 'Patrol location tracked successfully', result);
});

export const getRouteDirections = asyncHandler(async (req, res) => {
  const { origin, waypoints } = req.body;
  if (!origin || !waypoints) {
    throw new ApiError(400, 'origin and waypoints are required');
  }
  
  const route = await mapsService.getRouteDirections(origin, waypoints);
  return ApiResponse(res, 200, 'Directions calculated successfully', { route });
});
