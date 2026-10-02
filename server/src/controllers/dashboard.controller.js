import PoliceStation from '../models/PoliceStation.js';
import PoliceOfficer from '../models/PoliceOfficer.js';
import Complaint from '../models/Complaint.js';
import FIR from '../models/FIR.js';
import SOS from '../models/SOS.js';
import Patrol from '../models/Patrol.js';
import Notification from '../models/Notification.js';
import Announcement from '../models/Announcement.js';
import { calculateHotspots } from '../services/hotspot.service.js';
import { ApiResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

export const getAdminDashboard = asyncHandler(async (req, res) => {
  const totalStations = await PoliceStation.countDocuments({});
  const activeStations = await PoliceStation.countDocuments({ status: 'ACTIVE' });
  
  const totalOfficers = await PoliceOfficer.countDocuments({});
  const activeOfficers = await PoliceOfficer.countDocuments({ dutyStatus: 'AVAILABLE' });
  
  const totalComplaints = await Complaint.countDocuments({});
  const pendingComplaints = await Complaint.countDocuments({ status: 'SUBMITTED' });
  
  const totalFIRs = await FIR.countDocuments({});
  const activeSOS = await SOS.countDocuments({ status: { $in: ['ACTIVE', 'ACKNOWLEDGED', 'DISPATCHED', 'ESCALATED'] } });
  
  const hotspots = await calculateHotspots();
  const activeHotspots = hotspots.filter(h => h.severity === 'CRITICAL' || h.severity === 'HIGH').length;
  
  const recentSOS = await SOS.find({})
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('citizenId', 'name phone')
    .populate('nearestStationId', 'name');
    
  const recentComplaints = await Complaint.find({})
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('citizenId', 'name')
    .populate('policeStationId', 'name');
    
  return ApiResponse(res, 200, 'Admin dashboard summary retrieved', {
    totalStations,
    activeStations,
    totalOfficers,
    activeOfficers,
    totalComplaints,
    pendingComplaints,
    totalFIRs,
    activeSOS,
    activeHotspots,
    recentSOS,
    recentComplaints
  });
});

export const getStationDashboard = asyncHandler(async (req, res) => {
  // Resolve stationId for the logged-in user
  const officer = await PoliceOfficer.findOne({ userId: req.user._id });
  if (!officer || !officer.stationId) {
    throw new ApiError(400, 'You are not currently assigned to any police station');
  }
  
  const stationId = officer.stationId;
  const complaints = await Complaint.find({ policeStationId: stationId }).populate('citizenId', 'name').sort({ createdAt: -1 });
  const firs = await FIR.find({ policeStationId: stationId }).populate('citizenId', 'name').sort({ createdAt: -1 });
  const sos = await SOS.find({ nearestStationId: stationId }).populate('citizenId', 'name').sort({ createdAt: -1 });
  
  const officers = await PoliceOfficer.find({ stationId })
    .populate('userId', 'name email phone status')
    .sort({ role: 1 });
    
  const activePatrols = await Patrol.find({ stationId, status: 'ACTIVE' }).populate('officerIds', 'name');
  
  return ApiResponse(res, 200, 'Station dashboard summary retrieved', {
    stationId,
    complaints,
    firs,
    sos,
    officers,
    activePatrols
  });
});

export const getOfficerDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const officerProfile = await PoliceOfficer.findOne({ userId }).populate('stationId', 'name stationCode');
  
  if (!officerProfile) {
    throw new ApiError(404, 'Officer profile details not found');
  }
  
  const assignedComplaints = await Complaint.find({ assignedOfficerId: userId }).sort({ createdAt: -1 });
  const assignedFIRs = await FIR.find({ investigatingOfficerId: userId }).sort({ createdAt: -1 });
  const SOSAssignments = await SOS.find({ assignedOfficerId: userId, status: { $ne: 'RESOLVED' } }).sort({ createdAt: -1 });
  const patrolAssignments = await Patrol.find({ officerIds: userId, status: { $in: ['PLANNED', 'ACTIVE'] } }).sort({ createdAt: -1 });
  
  return ApiResponse(res, 200, 'Officer dashboard summary retrieved', {
    officerProfile,
    assignedComplaints,
    assignedFIRs,
    SOSAssignments,
    patrolAssignments,
    dutyStatus: officerProfile.dutyStatus
  });
});

export const getCitizenDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  const myComplaints = await Complaint.find({ citizenId: userId }).sort({ createdAt: -1 });
  const myFIRs = await FIR.find({ citizenId: userId }).sort({ createdAt: -1 });
  const activeSOS = await SOS.find({ citizenId: userId, status: { $ne: 'RESOLVED' } }).sort({ createdAt: -1 });
  
  const notifications = await Notification.find({ recipientId: userId }).sort({ createdAt: -1 }).limit(10);
  const announcements = await Announcement.find({ status: 'ACTIVE' }).sort({ createdAt: -1 }).limit(5);
  
  return ApiResponse(res, 200, 'Citizen dashboard summary retrieved', {
    myComplaints,
    myFIRs,
    activeSOS,
    notifications,
    announcements
  });
});
