import Suspect from '../models/Suspect.js';
import FIR from '../models/FIR.js';
import Complaint from '../models/Complaint.js';
import PoliceOfficer from '../models/PoliceOfficer.js';
import { ApiResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { generateUniqueId } from '../utils/generateId.js';
import { logAudit } from '../middleware/auditLog.middleware.js';

/**
 * Sanitizes suspect name and alias by stripping accidental column/label headers
 * (e.g., "Full Name", "Alias", "Legal Classification", extra tabs and spaces)
 */
export const sanitizeSuspectFields = (rawName, rawAlias) => {
  let name = (rawName || '').trim();
  let alias = (rawAlias || '').trim();

  // Strip table headers/labels if pasted into name field
  name = name
    .replace(/^(?:Full\s*Name\s*)?(?:Alias\s*)?(?:Legal\s*Classification\s*)?/gi, '')
    .replace(/^(?:Name|Suspect\s*Name|Fullname)\s*[:\-]\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip labels if pasted into alias field
  alias = alias
    .replace(/^(?:Alias|Known\s*As|Nickname)\s*[:\-]\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return { name, alias };
};

export const createSuspect = asyncHandler(async (req, res) => {
  const { name: rawName, alias: rawAlias, gender, age, phone, idProof, address, status, charges, firId, complaintId, arrestStatus } = req.body;

  const { name, alias } = sanitizeSuspectFields(rawName, rawAlias);

  if (!name || !name.trim()) {
    throw new ApiError(400, 'Suspect name is required');
  }

  let stationId = null;
  const officer = await PoliceOfficer.findOne({ userId: req.user._id });
  if (officer && officer.stationId) {
    stationId = officer.stationId;
  }

  let referencedFir = null;
  let referencedComplaint = null;

  // Validate referenced FIR if provided
  if (firId) {
    referencedFir = await FIR.findById(firId);
    if (!referencedFir) {
      throw new ApiError(404, `Referenced FIR not found with ID: ${firId}`);
    }
    if (!stationId && referencedFir.policeStationId) {
      stationId = referencedFir.policeStationId;
    }
  }

  // Validate referenced Complaint if provided
  if (complaintId) {
    referencedComplaint = await Complaint.findById(complaintId);
    if (!referencedComplaint) {
      throw new ApiError(404, `Referenced Complaint not found with ID: ${complaintId}`);
    }
    if (!stationId && referencedComplaint.policeStationId) {
      stationId = referencedComplaint.policeStationId;
    }

    // Check if an FIR already exists for this complaint to ensure bi-directional linking
    if (!referencedFir) {
      referencedFir = await FIR.findOne({ complaintId });
    }
  }

  const linkedFirSet = new Set();
  if (firId) linkedFirSet.add(firId.toString());
  if (referencedFir) linkedFirSet.add(referencedFir._id.toString());

  const linkedComplaintSet = new Set();
  if (complaintId) linkedComplaintSet.add(complaintId.toString());
  if (referencedFir?.complaintId) linkedComplaintSet.add(referencedFir.complaintId.toString());

  const suspectId = generateUniqueId('SUS');

  const suspect = await Suspect.create({
    suspectId,
    name,
    alias: alias || '',
    gender: gender || 'UNKNOWN',
    age: age ? Number(age) : null,
    phone: phone || '',
    idProof: idProof || '',
    address: address || '',
    status: status || 'SUSPECT',
    charges: charges || [],
    arrestStatus: arrestStatus ? {
      isArrested: Boolean(arrestStatus.isArrested),
      arrestDate: arrestStatus.arrestDate || null,
      arrestingOfficerId: arrestStatus.arrestingOfficerId || req.user._id,
      custodyLocation: arrestStatus.custodyLocation || ''
    } : undefined,
    createdOfficerId: req.user._id,
    stationId,
    linkedFirIds: Array.from(linkedFirSet),
    linkedComplaintIds: Array.from(linkedComplaintSet)
  });

  // Automatically update FIR's suspectIds array using $addToSet to prevent duplicates
  if (linkedFirSet.size > 0) {
    await FIR.updateMany(
      { _id: { $in: Array.from(linkedFirSet) } },
      { $addToSet: { suspectIds: suspect._id } }
    );
  }

  // Emit realtime updates to control room and assigned officers
  const { sendRealtimeEvent } = await import('../sockets/socket.js');
  sendRealtimeEvent('control-room', 'suspect:created', { message: `New suspect added: ${name}`, suspect });
  for (const linkedFId of linkedFirSet) {
    sendRealtimeEvent(`fir:${linkedFId}`, 'suspect:updated', { message: `Suspect ${name} linked to FIR`, suspect });
  }

  await logAudit({
    userId: req.user._id,
    userName: req.user.name,
    userRole: req.user.role,
    action: 'CREATE_SUSPECT',
    resourceType: 'Suspect',
    resourceId: suspect.suspectId,
    details: `Created suspect record for ${name} (${suspect.status})`
  });

  return ApiResponse(res, 201, 'Suspect record created successfully', { suspect });
});

export const getSuspects = asyncHandler(async (req, res) => {
  const { search, status, firId, complaintId } = req.query;
  const query = {};

  if (status) {
    query.status = status;
  }

  // FIR Filter
  if (firId) {
    query.linkedFirIds = firId;
  }

  // Complaint Filter (checks both direct complaint link and associated FIR link)
  if (complaintId) {
    const associatedFir = await FIR.findOne({ complaintId });
    if (associatedFir) {
      query.$or = [
        { linkedComplaintIds: complaintId },
        { linkedFirIds: associatedFir._id }
      ];
    } else {
      query.linkedComplaintIds = complaintId;
    }
  }

  if (search) {
    const searchFilter = [
      { name: { $regex: search, $options: 'i' } },
      { alias: { $regex: search, $options: 'i' } },
      { suspectId: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];

    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchFilter }];
      delete query.$or;
    } else {
      query.$or = searchFilter;
    }
  }

  // Jurisdiction filter for Station Head in general directory search (unless filtering for a specific case)
  if (req.user.role === 'STATION_HEAD' && !complaintId && !firId) {
    const officer = await PoliceOfficer.findOne({ userId: req.user._id });
    if (officer && officer.stationId) {
      // Station Head sees their station's suspects AND central/unassigned suspects
      const stationCondition = {
        $or: [
          { stationId: officer.stationId },
          { stationId: null }
        ]
      };

      if (query.$and) {
        query.$and.push(stationCondition);
      } else if (query.$or) {
        query.$and = [{ $or: query.$or }, stationCondition];
        delete query.$or;
      } else {
        query.$or = stationCondition.$or;
      }
    }
  }

  const suspects = await Suspect.find(query)
    .populate({
      path: 'linkedFirIds',
      select: 'firNumber crimeType status policeStationId investigatingOfficerId complaintId description',
      populate: [
        { path: 'policeStationId', select: 'name stationCode address' },
        { path: 'investigatingOfficerId', select: 'name email phone' },
        { path: 'complaintId', select: 'complaintId title location' }
      ]
    })
    .populate('linkedComplaintIds', 'complaintId title status location')
    .populate('stationId', 'name stationCode address')
    .populate('arrestStatus.arrestingOfficerId', 'name badgeNumber email')
    .sort({ createdAt: -1 });

  await logAudit({
    userId: req.user._id,
    userName: req.user.name,
    userRole: req.user.role,
    action: 'SEARCH_SUSPECTS',
    resourceType: 'Suspect',
    details: `Queried suspect directory (Count: ${suspects.length})`
  });

  return ApiResponse(res, 200, 'Suspects retrieved successfully', { suspects });
});

export const getSuspectById = asyncHandler(async (req, res) => {
  const suspect = await Suspect.findById(req.params.id)
    .populate({
      path: 'linkedFirIds',
      populate: [
        { path: 'policeStationId', select: 'name stationCode address' },
        { path: 'investigatingOfficerId', select: 'name email phone' },
        { path: 'complaintId', select: 'complaintId title location' }
      ]
    })
    .populate('linkedComplaintIds')
    .populate('stationId')
    .populate('createdOfficerId', 'name email phone')
    .populate('arrestStatus.arrestingOfficerId', 'name badgeNumber email');

  if (!suspect) {
    throw new ApiError(404, 'Suspect record not found');
  }

  await logAudit({
    userId: req.user._id,
    userName: req.user.name,
    userRole: req.user.role,
    action: 'VIEW_SUSPECT_DETAILS',
    resourceType: 'Suspect',
    resourceId: suspect.suspectId,
    details: `Accessed full dossier for ${suspect.name}`
  });

  return ApiResponse(res, 200, 'Suspect details retrieved successfully', { suspect });
});

export const updateSuspect = asyncHandler(async (req, res) => {
  const { name: rawName, alias: rawAlias, status, arrestStatus, courtOutcome, charges, address, phone, firId, complaintId } = req.body;

  const suspect = await Suspect.findById(req.params.id);
  if (!suspect) {
    throw new ApiError(404, 'Suspect record not found');
  }

  if (rawName || rawAlias) {
    const { name, alias } = sanitizeSuspectFields(rawName || suspect.name, rawAlias !== undefined ? rawAlias : suspect.alias);
    if (name) suspect.name = name;
    if (rawAlias !== undefined) suspect.alias = alias;
  }

  if (status) suspect.status = status;
  if (address !== undefined) suspect.address = address;
  if (phone !== undefined) suspect.phone = phone;
  if (charges) suspect.charges = charges;

  // Use arrestStatus consistently
  if (arrestStatus) {
    suspect.arrestStatus = {
      isArrested: arrestStatus.isArrested !== undefined ? Boolean(arrestStatus.isArrested) : suspect.arrestStatus?.isArrested,
      arrestDate: arrestStatus.arrestDate || suspect.arrestStatus?.arrestDate,
      arrestingOfficerId: arrestStatus.arrestingOfficerId || suspect.arrestStatus?.arrestingOfficerId || req.user._id,
      custodyLocation: arrestStatus.custodyLocation !== undefined ? arrestStatus.custodyLocation : suspect.arrestStatus?.custodyLocation
    };
  }

  if (courtOutcome) {
    suspect.courtOutcome = { ...suspect.courtOutcome, ...courtOutcome };
  }

  // Prevent duplicate FIR relationships using unique push
  if (firId) {
    const existingFir = await FIR.findById(firId);
    if (!existingFir) {
      throw new ApiError(404, `Referenced FIR not found with ID: ${firId}`);
    }
    if (!suspect.linkedFirIds.map(id => id.toString()).includes(firId.toString())) {
      suspect.linkedFirIds.push(firId);
    }
    await FIR.findByIdAndUpdate(firId, { $addToSet: { suspectIds: suspect._id } });
  }

  // Prevent duplicate Complaint relationships and automatically link associated FIR if exists
  if (complaintId) {
    const existingComplaint = await Complaint.findById(complaintId);
    if (!existingComplaint) {
      throw new ApiError(404, `Referenced Complaint not found with ID: ${complaintId}`);
    }
    if (!suspect.linkedComplaintIds.map(id => id.toString()).includes(complaintId.toString())) {
      suspect.linkedComplaintIds.push(complaintId);
    }

    // Bi-directionally sync with FIR if already registered for this complaint
    const associatedFir = await FIR.findOne({ complaintId });
    if (associatedFir) {
      if (!suspect.linkedFirIds.map(id => id.toString()).includes(associatedFir._id.toString())) {
        suspect.linkedFirIds.push(associatedFir._id);
      }
      await FIR.findByIdAndUpdate(associatedFir._id, { $addToSet: { suspectIds: suspect._id } });
    }
  }

  await suspect.save();

  const { sendRealtimeEvent } = await import('../sockets/socket.js');
  sendRealtimeEvent('control-room', 'suspect:updated', { message: `Suspect updated: ${suspect.name}`, suspect });
  if (firId) {
    sendRealtimeEvent(`fir:${firId}`, 'suspect:updated', { message: `Suspect ${suspect.name} updated`, suspect });
  }

  await logAudit({
    userId: req.user._id,
    userName: req.user.name,
    userRole: req.user.role,
    action: 'UPDATE_SUSPECT',
    resourceType: 'Suspect',
    resourceId: suspect.suspectId,
    details: `Updated suspect ${suspect.name} (Status: ${suspect.status})`
  });

  return ApiResponse(res, 200, 'Suspect updated successfully', { suspect });
});
