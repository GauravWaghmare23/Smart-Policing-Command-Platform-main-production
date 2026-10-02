import AuditLog from '../models/AuditLog.js';
import PoliceOfficer from '../models/PoliceOfficer.js';
import Complaint from '../models/Complaint.js';
import FIR from '../models/FIR.js';
import SOS from '../models/SOS.js';
import { ApiResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { search, resourceType, action, userRole, policeStationId, startDate, endDate, resourceId } = req.query;
  const filter = {};

  // Role-based visibility enforcement
  if (req.user.role === 'STATION_HEAD') {
    const officer = await PoliceOfficer.findOne({ userId: req.user._id });
    if (officer && officer.stationId) {
      filter.policeStationId = officer.stationId;
    }
  } else if (req.user.role === 'INVESTIGATING_OFFICER' || req.user.role === 'FIELD_OFFICER') {
    filter.userId = req.user._id;
  } else if (req.user.role === 'CITIZEN') {
    throw new ApiError(403, 'Citizens cannot access central police audit logs. Use citizen timeline.');
  }

  if (resourceType) filter.resourceType = resourceType;
  if (action) filter.action = action;
  if (userRole) filter.userRole = userRole;
  if (policeStationId && req.user.role === 'CONTROL_ROOM_ADMIN') filter.policeStationId = policeStationId;
  if (resourceId) filter.resourceId = resourceId;

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { userName: searchRegex },
      { action: searchRegex },
      { resourceType: searchRegex },
      { resourceId: searchRegex },
      { details: searchRegex }
    ];
  }

  const logs = await AuditLog.find(filter)
    .populate('userId', 'name email role')
    .populate('policeStationId', 'name stationCode')
    .sort({ createdAt: -1 })
    .limit(300);

  return ApiResponse(res, 200, 'Audit logs retrieved successfully', { logs });
});

export const getCitizenTimeline = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;

  // Retrieve complaint or FIR or SOS to verify ownership
  let isOwner = false;
  const complaint = await Complaint.findOne({ $or: [{ _id: resourceId }, { complaintId: resourceId }] });
  if (complaint && complaint.citizenId.toString() === req.user._id.toString()) {
    isOwner = true;
  }

  const fir = await FIR.findOne({ $or: [{ _id: resourceId }, { firNumber: resourceId }] });
  if (fir && fir.citizenId.toString() === req.user._id.toString()) {
    isOwner = true;
  }

  const sos = await SOS.findOne({ $or: [{ _id: resourceId }, { sosId: resourceId }] });
  if (sos && sos.citizenId.toString() === req.user._id.toString()) {
    isOwner = true;
  }

  if (req.user.role === 'CITIZEN' && !isOwner) {
    throw new ApiError(403, 'Access denied. You can only view audit timelines for your own cases.');
  }

  // Fetch citizen-safe audit entries (never exposing internal police notes)
  const auditEntries = await AuditLog.find({
    $or: [{ resourceId }, { resourceId: complaint?._id }, { resourceId: fir?._id }, { resourceId: sos?._id }],
    isCitizenVisible: true
  })
    .sort({ createdAt: 1 })
    .select('action resourceType citizenSummary createdAt userRole userName');

  const timeline = auditEntries.map(entry => ({
    title: entry.action.replace(/_/g, ' '),
    summary: entry.citizenSummary || `${entry.resourceType} action performed`,
    handledByRole: entry.userRole !== 'CITIZEN' ? entry.userRole.replace(/_/g, ' ') : 'Complainant',
    timestamp: entry.createdAt
  }));

  return ApiResponse(res, 200, 'Citizen timeline compiled successfully', { timeline });
});
