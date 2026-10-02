import * as complaintService from '../services/complaint.service.js';
import { ApiResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { env } from '../config/env.js';

export const createComplaint = asyncHandler(async (req, res) => {
  const citizenId = req.user._id;
  const complaint = await complaintService.createComplaint(citizenId, req.body);
  return ApiResponse(res, 201, 'Complaint registered successfully', { complaint });
});

export const getComplaints = asyncHandler(async (req, res) => {
  const filter = {};
  
  // Citizen can only see their own complaints
  if (req.user.role === 'CITIZEN') {
    filter.citizenId = req.user._id;
  } else if (req.user.role === 'STATION_HEAD') {
    // Station Head can see only their station's complaints
    const PoliceOfficer = await import('../models/PoliceOfficer.js');
    const officer = await PoliceOfficer.default.findOne({ userId: req.user._id });
    if (officer && officer.stationId) {
      filter.policeStationId = officer.stationId;
    } else {
      filter.policeStationId = null;
    }
  } else if (req.user.role === 'INVESTIGATING_OFFICER') {
    // Investigating Officer can see only their assigned complaints
    filter.assignedOfficerId = req.user._id;
  }
  
  const complaints = await complaintService.getComplaintsList(filter);
  return ApiResponse(res, 200, 'Complaints retrieved successfully', { complaints });
});

export const getComplaintById = asyncHandler(async (req, res) => {
  const complaint = await complaintService.getComplaintDetails(req.params.id);
  
  // Check ownership
  if (req.user.role === 'CITIZEN' && complaint.citizenId._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied. You cannot view this complaint.');
  }
  
  return ApiResponse(res, 200, 'Complaint retrieved successfully', { complaint });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) {
    throw new ApiError(400, 'status is required');
  }
  const complaint = await complaintService.updateComplaintStatus(req.params.id, status, req.user._id);
  return ApiResponse(res, 200, 'Complaint status updated successfully', { complaint });
});

export const assignOfficer = asyncHandler(async (req, res) => {
  const { officerUserId } = req.body;
  if (!officerUserId) {
    throw new ApiError(400, 'officerUserId is required');
  }
  const complaint = await complaintService.assignOfficerToComplaint(req.params.id, officerUserId);
  return ApiResponse(res, 200, 'Officer assigned to complaint successfully', { complaint });
});

export const uploadEvidence = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No file was uploaded');
  }
  
  // Construct serving file URL
  const fileUrl = `${env.apiBaseUrl}/uploads/${req.file.destination.split('/').pop()}/${req.file.filename}`;
  
  const fileData = {
    type: req.file.mimetype.split('/')[0].toUpperCase(), // IMAGE, VIDEO, DOCUMENT
    originalName: req.file.originalname,
    filename: req.file.filename,
    path: fileUrl,
    uploadedAt: new Date()
  };
  
  const complaint = await complaintService.addEvidenceToComplaint(req.params.id, fileData);
  return ApiResponse(res, 200, 'Evidence uploaded successfully', { complaint });
});

export const addCaseUpdate = asyncHandler(async (req, res) => {
  const { note, updateType, isCitizenVisible } = req.body;
  if (!note || !note.trim()) {
    throw new ApiError(400, 'Update note content is required');
  }

  const complaint = await complaintService.addCaseUpdate(req.params.id, {
    note: note.trim(),
    updateType,
    isCitizenVisible,
    addedBy: req.user._id
  });

  return ApiResponse(res, 201, 'Case update added successfully', { complaint });
});

export const resolveCase = asyncHandler(async (req, res) => {
  const { summary, suspectOutcome, courtOutcome } = req.body;
  if (!summary || !summary.trim()) {
    throw new ApiError(400, 'Resolution summary is required before closing a case');
  }

  const complaint = await complaintService.resolveWithDetails(req.params.id, {
    summary: summary.trim(),
    suspectOutcome,
    courtOutcome,
    resolvedBy: req.user._id
  });

  return ApiResponse(res, 200, 'Case resolved successfully with final summary', { complaint });
});
