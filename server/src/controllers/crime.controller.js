import * as hotspotService from '../services/hotspot.service.js';
import { ApiResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getHotspots = asyncHandler(async (req, res) => {
  const hotspots = await hotspotService.calculateHotspots();
  return ApiResponse(res, 200, 'Crime hotspots retrieved successfully', { hotspots });
});

export const getStatistics = asyncHandler(async (req, res) => {
  const statistics = await hotspotService.getCrimeStatistics();
  return ApiResponse(res, 200, 'Crime statistics retrieved successfully', { statistics });
});
