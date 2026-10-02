import Announcement from '../models/Announcement.js';
import { ApiResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { sendRealtimeEvent, getIO } from '../sockets/socket.js';

export const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, message, type, severity, targetAreaName, expiresAt } = req.body;
  
  // Resolve optional stationId for station heads
  let stationId = null;
  if (req.user.role === 'STATION_HEAD') {
    const PoliceOfficer = await import('../models/PoliceOfficer.js');
    const officer = await PoliceOfficer.default.findOne({ userId: req.user._id });
    if (officer) {
      stationId = officer.stationId;
    }
  }
  
  const announcement = await Announcement.create({
    title,
    message,
    type,
    severity,
    targetArea: {
      name: targetAreaName
    },
    stationId,
    createdBy: req.user._id,
    expiresAt: expiresAt || null
  });
  
  // Realtime Broadcast
  sendRealtimeEvent('control-room', 'announcement:new', { announcement });
  // Broadcast to ALL connected sockets (citizens + police + admin) — public safety alert
  const io = getIO();
  if (io) {
    io.emit('announcement:new', { announcement });
    console.log(`[SOCKET] Broadcasted announcement:new to all sockets`);
  }
  if (stationId) {
    sendRealtimeEvent(`station:${stationId}`, 'announcement:new', { announcement });
  }
  
  return ApiResponse(res, 201, 'Public safety announcement created successfully', { announcement });
});

export const getAnnouncements = asyncHandler(async (req, res) => {
  // Public route - anyone (citizen, police, admin) can fetch active announcements
  const filter = { status: 'ACTIVE' };
  
  if (req.query.type) filter.type = req.query.type;
  if (req.query.severity) filter.severity = req.query.severity;
  
  const announcements = await Announcement.find(filter)
    .sort({ createdAt: -1 })
    .populate('stationId', 'name stationCode')
    .populate('createdBy', 'name');
    
  return ApiResponse(res, 200, 'Announcements retrieved successfully', { announcements });
});

export const getAnnouncementById = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id)
    .populate('stationId', 'name stationCode')
    .populate('createdBy', 'name');
    
  if (!announcement) {
    throw new ApiError(404, 'Announcement not found');
  }
  
  return ApiResponse(res, 200, 'Announcement details retrieved successfully', { announcement });
});

export const updateAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) {
    throw new ApiError(404, 'Announcement not found');
  }
  
  // Check authorization (only creator or Admin can update)
  if (req.user.role !== 'CONTROL_ROOM_ADMIN' && announcement.createdBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Unauthorized to update this announcement');
  }
  
  const { title, message, type, severity, targetAreaName, status, expiresAt } = req.body;
  if (title) announcement.title = title;
  if (message) announcement.message = message;
  if (type) announcement.type = type;
  if (severity) announcement.severity = severity;
  if (targetAreaName) announcement.targetArea.name = targetAreaName;
  if (status) announcement.status = status;
  if (expiresAt !== undefined) announcement.expiresAt = expiresAt;
  
  await announcement.save();
  return ApiResponse(res, 200, 'Announcement updated successfully', { announcement });
});

export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) {
    throw new ApiError(404, 'Announcement not found');
  }
  
  if (req.user.role !== 'CONTROL_ROOM_ADMIN' && announcement.createdBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Unauthorized to delete this announcement');
  }
  
  announcement.status = 'ARCHIVED';
  await announcement.save();
  
  return ApiResponse(res, 200, 'Announcement archived successfully', { announcement });
});
