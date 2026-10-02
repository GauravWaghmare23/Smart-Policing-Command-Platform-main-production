import mongoose from 'mongoose';
import FIR from '../models/FIR.js';
import Complaint from '../models/Complaint.js';
import Suspect from '../models/Suspect.js';
import PoliceOfficer from '../models/PoliceOfficer.js';
import PoliceStation from '../models/PoliceStation.js';
import { ApiResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { logAudit } from '../middleware/auditLog.middleware.js';

/**
 * Multi-criteria search across cases
 */
export const searchCases = asyncHandler(async (req, res) => {
  const { query, crimeType, status, policeStationId, officerId } = req.query;

  const firFilter = {};
  if (crimeType) firFilter.crimeType = crimeType;
  if (status) firFilter.status = status;
  if (policeStationId) firFilter.policeStationId = policeStationId;
  if (officerId) firFilter.investigatingOfficerId = officerId;

  // Station Head Scope enforcement
  if (req.user.role === 'STATION_HEAD') {
    const officer = await PoliceOfficer.findOne({ userId: req.user._id });
    if (officer && officer.stationId) {
      firFilter.policeStationId = officer.stationId;
    }
  } else if (req.user.role === 'INVESTIGATING_OFFICER' || req.user.role === 'FIELD_OFFICER') {
    firFilter.investigatingOfficerId = req.user._id;
  }

  if (query) {
    const searchRegex = new RegExp(query, 'i');
    const matchingSuspects = await Suspect.find({ name: searchRegex }).select('_id');
    const suspectIds = matchingSuspects.map(s => s._id);

    firFilter.$or = [
      { firNumber: searchRegex },
      { description: searchRegex },
      { suspectIds: { $in: suspectIds } }
    ];
  }

  const firs = await FIR.find(firFilter)
    .populate('complaintId', 'complaintId title location priority')
    .populate('citizenId', 'name email phone')
    .populate('policeStationId', 'name stationCode address')
    .populate('investigatingOfficerId', 'name email phone')
    .populate('suspectIds', 'suspectId name status charges arrestStatus')
    .sort({ createdAt: -1 });

  await logAudit({
    userId: req.user._id,
    userName: req.user.name,
    userRole: req.user.role,
    action: 'SEARCH_CASE_DOSSIERS',
    resourceType: 'Dossier',
    details: `Case search performed with criteria: ${JSON.stringify(req.query)} (Results: ${firs.length})`
  });

  return ApiResponse(res, 200, 'Case search completed successfully', { cases: firs });
});

/**
 * Builds full interconnected dossier graph for a single case ID or FIR ID or Complaint ID
 */
export const getCaseDossier = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let fir = await FIR.findOne({ $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { firNumber: id }] })
    .populate('complaintId')
    .populate('citizenId', 'name email phone')
    .populate('policeStationId')
    .populate('investigatingOfficerId', 'name email phone')
    .populate('suspectIds')
    .populate('evidenceList.collectedBy', 'name badgeNumber');

  let complaint = null;
  if (fir) {
    complaint = fir.complaintId;
  } else {
    // Attempt lookup via complaint ID
    complaint = await Complaint.findOne({ $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { complaintId: id }] })
      .populate('citizenId', 'name email phone')
      .populate('policeStationId')
      .populate('assignedOfficerId', 'name email phone');

    if (complaint) {
      fir = await FIR.findOne({ complaintId: complaint._id })
        .populate('investigatingOfficerId', 'name email phone')
        .populate('suspectIds')
        .populate('evidenceList.collectedBy', 'name badgeNumber');
    }
  }

  if (!fir && !complaint) {
    throw new ApiError(404, 'Case dossier record not found');
  }

  // Get officer profile stats if officer exists
  let officerProfile = null;
  const officerUserId = fir?.investigatingOfficerId?._id || complaint?.assignedOfficerId?._id;
  if (officerUserId) {
    officerProfile = await PoliceOfficer.findOne({ userId: officerUserId })
      .populate('userId', 'name email phone')
      .populate('stationId', 'name stationCode');
  }

  // Interconnected graph representation
  const dossierGraph = {
    complaint,
    fir,
    suspects: fir?.suspectIds || [],
    evidence: [
      ...(complaint?.evidence || []).map(e => ({ ...e.toObject(), source: 'Citizen Submission' })),
      ...(fir?.evidenceList || []).map(e => ({ ...e.toObject(), source: 'Investigation Evidence' }))
    ],
    officer: fir?.investigatingOfficerId || complaint?.assignedOfficerId,
    officerProfile,
    station: fir?.policeStationId || complaint?.policeStationId,
    timeline: fir?.investigationTimeline || [],
    courtOutcome: fir?.courtOutcome || null
  };

  await logAudit({
    userId: req.user._id,
    userName: req.user.name,
    userRole: req.user.role,
    action: 'VIEW_CASE_DOSSIER',
    resourceType: 'Dossier',
    resourceId: id,
    details: `Accessed full dossier for FIR: ${fir?.firNumber || 'N/A'}, Complaint: ${complaint?.complaintId || 'N/A'}`
  });

  return ApiResponse(res, 200, 'Case dossier compiled successfully', { dossier: dossierGraph });
});
