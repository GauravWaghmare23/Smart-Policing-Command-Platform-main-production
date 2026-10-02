import User from '../models/User.js';
import Complaint from '../models/Complaint.js';
import FIR from '../models/FIR.js';
import SOS from '../models/SOS.js';
import ApiError from '../utils/ApiError.js';

export const getCitizenProfile = async (citizenUserId) => {
  const citizen = await User.findById(citizenUserId).select('-password');
  if (!citizen) {
    throw new ApiError(404, 'Citizen user not found');
  }

  const complaints = await Complaint.find({ citizenId: citizenUserId })
    .populate('policeStationId', 'name stationCode')
    .populate('assignedOfficerId', 'name email phone rank badgeNumber')
    .sort({ createdAt: -1 });

  const firs = await FIR.find({ citizenId: citizenUserId })
    .populate('policeStationId', 'name stationCode')
    .populate('investigatingOfficerId', 'name email phone rank badgeNumber')
    .sort({ createdAt: -1 });

  const sosHistory = await SOS.find({ citizenId: citizenUserId })
    .populate('nearestStationId', 'name stationCode')
    .populate('assignedOfficerId', 'name email phone')
    .sort({ createdAt: -1 });

  // Gather all evidence submitted across citizen's complaints
  const submittedEvidence = complaints.flatMap(c => (c.evidence || []).map(e => ({
    ...e.toObject(),
    complaintId: c.complaintId,
    complaintTitle: c.title,
    crimeType: c.crimeType
  })));

  const statistics = {
    totalComplaints: complaints.length,
    totalFIRs: firs.length,
    totalSOS: sosHistory.length,
    totalEvidence: submittedEvidence.length,
    resolvedComplaints: complaints.filter(c => c.status === 'RESOLVED').length,
    activeComplaints: complaints.filter(c => c.status !== 'RESOLVED' && c.status !== 'REJECTED').length
  };

  return {
    citizen,
    statistics,
    complaints,
    firs,
    sosHistory,
    submittedEvidence
  };
};
