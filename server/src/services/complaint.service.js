import Complaint from '../models/Complaint.js';
import PoliceStation from '../models/PoliceStation.js';
import ApiError from '../utils/ApiError.js';
import { generateUniqueId } from '../utils/generateId.js';
import { calculateDistance } from '../utils/distance.js';
import { COMPLAINT_STATUS } from '../utils/constants.js';
import { sendRealtimeEvent } from '../sockets/socket.js';
import { createNotificationRecord } from './notification.service.js';

export const createComplaint = async (citizenId, complaintData) => {
  const { title, description, latitude, longitude, address, crimeType } = complaintData;
  
  // Find all active police stations
  const stations = await PoliceStation.find({ status: 'ACTIVE' });
  if (stations.length === 0) {
    throw new ApiError(500, 'No active police stations available to route complaint');
  }
  
  // Calculate nearest station using Haversine formula
  let nearestStation = null;
  let minDistance = Infinity;
  
  stations.forEach((station) => {
    const dist = calculateDistance(
      latitude,
      longitude,
      station.location.latitude,
      station.location.longitude
    );
    if (dist < minDistance) {
      minDistance = dist;
      nearestStation = station;
    }
  });
  
  const complaintId = generateUniqueId('CMP');
  
  const complaint = await Complaint.create({
    complaintId,
    citizenId,
    crimeType,
    title,
    description,
    location: {
      latitude,
      longitude,
      address
    },
    policeStationId: nearestStation ? nearestStation._id : null,
    status: COMPLAINT_STATUS.SUBMITTED
  });
  
  // Realtime notification
  // Emit to control room
  sendRealtimeEvent('control-room', 'complaint:new', {
    message: `New complaint submitted: ${title}`,
    complaint
  });
  
  // Emit to nearest station head
  if (nearestStation) {
    sendRealtimeEvent(`station:${nearestStation._id}`, 'complaint:new', {
      message: `New complaint assigned to station: ${title}`,
      complaint
    });
  }
  
  return complaint;
};

export const getComplaintsList = async (filter = {}) => {
  return await Complaint.find(filter)
    .populate('citizenId', 'name email phone')
    .populate('policeStationId', 'name stationCode')
    .populate('assignedOfficerId', 'name email phone');
};

export const getComplaintDetails = async (id) => {
  const complaint = await Complaint.findById(id)
    .populate('citizenId', 'name email phone status avatar createdAt')
    .populate('policeStationId', 'name stationCode address phone')
    .populate('assignedOfficerId', 'name email phone rank badgeNumber')
    .populate('caseUpdates.addedBy', 'name role email');
  
  if (!complaint) {
    throw new ApiError(404, 'Complaint not found');
  }
  return complaint;
};

export const updateComplaintStatus = async (complaintId, status, updatedByUserId) => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new ApiError(404, 'Complaint not found');
  }
  
  complaint.status = status;
  await complaint.save();
  
  // Notify citizen about status change
  await createNotificationRecord({
    recipientId: complaint.citizenId,
    type: 'COMPLAINT',
    title: 'Complaint Status Updated',
    message: `Your complaint with ID ${complaint.complaintId} status has been changed to ${status}`,
    referenceType: 'COMPLAINT',
    referenceId: complaint._id
  });
  
  sendRealtimeEvent(`citizen:${complaint.citizenId}`, 'complaint:updated', {
    message: `Complaint ${complaint.complaintId} status updated to ${status}`,
    complaint
  });
  
  return complaint;
};

export const assignOfficerToComplaint = async (complaintId, officerUserId) => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new ApiError(404, 'Complaint not found');
  }
  
  complaint.assignedOfficerId = officerUserId;
  complaint.status = COMPLAINT_STATUS.ASSIGNED;
  await complaint.save();
  
  // Notify officer
  await createNotificationRecord({
    recipientId: officerUserId,
    type: 'COMPLAINT',
    title: 'New Complaint Assigned',
    message: `You have been assigned to investigate complaint: ${complaint.title} (${complaint.complaintId})`,
    referenceType: 'COMPLAINT',
    referenceId: complaint._id
  });
  
  sendRealtimeEvent(`officer:${officerUserId}`, 'complaint:updated', {
    message: `You have been assigned to complaint ${complaint.complaintId}`,
    complaint
  });
  
  // Notify citizen
  await createNotificationRecord({
    recipientId: complaint.citizenId,
    type: 'COMPLAINT',
    title: 'Officer Assigned to Complaint',
    message: `An officer has been assigned to investigate your complaint ${complaint.complaintId}`,
    referenceType: 'COMPLAINT',
    referenceId: complaint._id
  });
  
  return complaint;
};

export const addEvidenceToComplaint = async (complaintId, fileData) => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new ApiError(404, 'Complaint not found');
  }
  
  complaint.evidence.push(fileData);
  await complaint.save();
  return complaint;
};

export const addCaseUpdate = async (complaintId, { note, updateType, isCitizenVisible, addedBy }) => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new ApiError(404, 'Complaint not found');
  }

  const newUpdate = {
    note,
    updateType: updateType || 'GENERAL',
    isCitizenVisible: isCitizenVisible !== undefined ? Boolean(isCitizenVisible) : true,
    addedBy,
    createdAt: new Date()
  };

  complaint.caseUpdates.push(newUpdate);
  await complaint.save();

  // If citizen visible, notify complainant
  if (newUpdate.isCitizenVisible) {
    await createNotificationRecord({
      recipientId: complaint.citizenId,
      type: 'COMPLAINT',
      title: 'New Case Update Received',
      message: `Update on Complaint #${complaint.complaintId}: ${note}`,
      referenceType: 'COMPLAINT',
      referenceId: complaint._id
    });

    sendRealtimeEvent(`citizen:${complaint.citizenId}`, 'complaint:updated', {
      message: `Case update on ${complaint.complaintId}`,
      complaint
    });
  }

  return complaint;
};

export const resolveWithDetails = async (complaintId, { summary, suspectOutcome, courtOutcome, resolvedBy }) => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new ApiError(404, 'Complaint not found');
  }

  complaint.status = COMPLAINT_STATUS.RESOLVED;
  complaint.resolutionDetails = {
    summary,
    suspectOutcome: suspectOutcome || '',
    courtOutcome: courtOutcome || '',
    resolvedAt: new Date(),
    resolvedBy
  };

  await complaint.save();

  await createNotificationRecord({
    recipientId: complaint.citizenId,
    type: 'COMPLAINT',
    title: 'Complaint Resolved',
    message: `Your complaint #${complaint.complaintId} has been marked RESOLVED. Summary: ${summary}`,
    referenceType: 'COMPLAINT',
    referenceId: complaint._id
  });

  sendRealtimeEvent(`citizen:${complaint.citizenId}`, 'complaint:updated', {
    message: `Complaint ${complaint.complaintId} resolved`,
    complaint
  });

  return complaint;
};
