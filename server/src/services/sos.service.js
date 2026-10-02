import SOS from '../models/SOS.js';
import PoliceStation from '../models/PoliceStation.js';
import PoliceOfficer from '../models/PoliceOfficer.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { generateUniqueId } from '../utils/generateId.js';
import { calculateDistance } from '../utils/distance.js';
import { SOS_STATUS, DUTY_STATUS, ROLES, AUDIT_ACTIONS } from '../utils/constants.js';
import { sendRealtimeEvent } from '../sockets/socket.js';
import { createNotificationRecord } from './notification.service.js';
import { publishToQueue, QUEUES } from '../config/rabbitmq.js';
import { logAudit } from '../middleware/auditLog.middleware.js';
import { env } from '../config/env.js';
import { isOfficerLocationFresh } from './officer.service.js';

// In-memory active timeout timers for SOS acknowledgement
const activeAckTimers = new Map();

/**
 * Find all active police stations ordered by distance to given coordinates.
 */
export const findNearbyStations = async (latitude, longitude, maxRadiusKm = null) => {
  const stations = await PoliceStation.find({ status: 'ACTIVE' });
  const stationsWithDistance = stations.map((st) => {
    const dist = calculateDistance(
      latitude,
      longitude,
      st.location.latitude,
      st.location.longitude
    );
    return {
      station: st,
      distanceKm: Number(dist.toFixed(2))
    };
  });

  stationsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

  if (maxRadiusKm != null) {
    return stationsWithDistance.filter((s) => s.distanceKm <= maxRadiusKm);
  }
  return stationsWithDistance;
};

/**
 * Intelligent two-tier officer selection algorithm for SOS dispatch:
 * Tier 1: Search live available officers with fresh GPS within `sosNearbyRadiusKm` (default: 5km).
 * Tier 2: Search active police stations within `sosExpandedRadiusKm` (default: 20km) and pick closest eligible officer.
 * Returns { officer, distanceKm, tier, station } or null.
 */
export const findBestOfficerForSOS = async (latitude, longitude, options = {}) => {
  const {
    excludedOfficerUserIds = [],
    nearbyRadiusKm = env.sosNearbyRadiusKm,
    expandedRadiusKm = env.sosExpandedRadiusKm,
    freshnessMinutes = env.sosLocationFreshnessMinutes
  } = options;

  const excludedIds = (excludedOfficerUserIds || []).map((id) => id.toString());

  // Fetch all active/available officers
  const eligibleOfficers = await PoliceOfficer.find({
    dutyStatus: { $in: [DUTY_STATUS.AVAILABLE, DUTY_STATUS.ON_DUTY] }
  })
    .populate({
      path: 'userId',
      select: 'name email phone status avatar'
    })
    .populate('stationId', 'name stationCode address location phone');

  // Filter out excluded officers and inactive user records
  const candidates = eligibleOfficers.filter((off) => {
    if (!off.userId?._id) return false;
    if (off.userId.status !== 'ACTIVE') return false;
    return !excludedIds.includes(off.userId._id.toString());
  });

  // -------------------------------------------------------------
  // TIER 1: Search nearby officers with live fresh GPS within nearbyRadiusKm
  // -------------------------------------------------------------
  const liveNearbyOfficers = [];

  candidates.forEach((off) => {
    if (isOfficerLocationFresh(off, freshnessMinutes)) {
      const dist = calculateDistance(
        latitude,
        longitude,
        off.currentLocation.latitude,
        off.currentLocation.longitude
      );
      if (dist <= nearbyRadiusKm) {
        liveNearbyOfficers.push({
          officer: off,
          distanceKm: Number(dist.toFixed(2)),
          tier: 'TIER_1_NEARBY_LIVE'
        });
      }
    }
  });

  if (liveNearbyOfficers.length > 0) {
    liveNearbyOfficers.sort((a, b) => a.distanceKm - b.distanceKm);
    return liveNearbyOfficers[0];
  }

  // -------------------------------------------------------------
  // TIER 2: Search nearby stations within expandedRadiusKm
  // -------------------------------------------------------------
  const nearbyStations = await findNearbyStations(latitude, longitude, expandedRadiusKm);

  for (const item of nearbyStations) {
    const stationIdStr = item.station._id.toString();
    const stationOfficers = candidates.filter(
      (off) => off.stationId?._id?.toString() === stationIdStr || off.stationId?.toString() === stationIdStr
    );

    if (stationOfficers.length > 0) {
      // Calculate effective distance for each officer at this station
      const rankedStationOfficers = stationOfficers.map((off) => {
        let dist;
        let isLive = false;
        if (isOfficerLocationFresh(off, freshnessMinutes)) {
          dist = calculateDistance(
            latitude,
            longitude,
            off.currentLocation.latitude,
            off.currentLocation.longitude
          );
          isLive = true;
        } else {
          dist = item.distanceKm;
        }
        return {
          officer: off,
          distanceKm: Number(dist.toFixed(2)),
          isLive,
          station: item.station,
          tier: 'TIER_2_STATION_FALLBACK'
        };
      });

      rankedStationOfficers.sort((a, b) => a.distanceKm - b.distanceKm);
      return rankedStationOfficers[0];
    }
  }

  // -------------------------------------------------------------
  // TIER 3: No suitable officer found in nearby or expanded radius
  // -------------------------------------------------------------
  return null;
};

/**
 * Schedule acknowledgement timeout for a dispatched SOS.
 */
export const scheduleAckTimeout = (sosId, officerUserId, timeoutSeconds = env.sosAckTimeoutSeconds) => {
  const timerKey = `${sosId.toString()}:${officerUserId.toString()}`;
  if (activeAckTimers.has(timerKey)) {
    clearTimeout(activeAckTimers.get(timerKey));
  }

  const timer = setTimeout(async () => {
    activeAckTimers.delete(timerKey);
    try {
      await handleAckTimeout(sosId, officerUserId);
    } catch (err) {
      console.error(`[SOS-TIMEOUT] Error executing timeout for SOS ${sosId}:`, err);
    }
  }, timeoutSeconds * 1000);

  activeAckTimers.set(timerKey, timer);
};

/**
 * Clear acknowledgement timeout.
 */
export const clearAckTimeout = (sosId, officerUserId = null) => {
  if (officerUserId) {
    const timerKey = `${sosId.toString()}:${officerUserId.toString()}`;
    if (activeAckTimers.has(timerKey)) {
      clearTimeout(activeAckTimers.get(timerKey));
      activeAckTimers.delete(timerKey);
    }
  } else {
    for (const [key, timer] of activeAckTimers.entries()) {
      if (key.startsWith(`${sosId.toString()}:`)) {
        clearTimeout(timer);
        activeAckTimers.delete(key);
      }
    }
  }
};

/**
 * Trigger an SOS distress beacon.
 */
export const triggerSOS = async (citizenId, locationData) => {
  const { latitude, longitude, address } = locationData;

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
    throw new ApiError(400, 'Valid latitude and longitude coordinates are required');
  }

  // 1. Find nearest police station
  const nearbyStations = await findNearbyStations(lat, lng);
  const nearestStationItem = nearbyStations.length > 0 ? nearbyStations[0] : null;
  const nearestStation = nearestStationItem ? nearestStationItem.station : null;
  const stationDistKm = nearestStationItem ? nearestStationItem.distanceKm : null;

  // 2. Find best officer via two-tier dispatch algorithm
  const dispatchCandidate = await findBestOfficerForSOS(lat, lng);

  const sosId = generateUniqueId('SOS');
  let sosStatus = SOS_STATUS.ACTIVE;
  let assignedOfficerUserId = null;
  let officerDistKm = null;
  let escalationReason = '';
  const now = new Date();
  const dispatchHistory = [];
  let ackTimeoutAt = null;

  if (dispatchCandidate) {
    const assignedOfficer = dispatchCandidate.officer;
    assignedOfficerUserId = assignedOfficer.userId._id;
    officerDistKm = dispatchCandidate.distanceKm;
    sosStatus = SOS_STATUS.DISPATCHED;

    assignedOfficer.dutyStatus = DUTY_STATUS.BUSY;
    await assignedOfficer.save();

    dispatchHistory.push({
      officerId: assignedOfficerUserId,
      dispatchedAt: now,
      status: 'DISPATCHED'
    });

    ackTimeoutAt = new Date(now.getTime() + env.sosAckTimeoutSeconds * 1000);
  } else {
    sosStatus = SOS_STATUS.ESCALATED;
    escalationReason = `No available police officers found within primary (${env.sosNearbyRadiusKm} km) or expanded (${env.sosExpandedRadiusKm} km) search radius.`;
  }

  const sos = await SOS.create({
    sosId,
    citizenId: citizenId || null,
    location: {
      latitude: lat,
      longitude: lng,
      address: address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    },
    nearestStationId: nearestStation ? nearestStation._id : null,
    assignedOfficerId: assignedOfficerUserId,
    status: sosStatus,
    dispatchedAt: dispatchCandidate ? now : null,
    officerDistanceKm: officerDistKm,
    stationDistanceKm: stationDistKm,
    escalationReason,
    dispatchHistory,
    ackTimeoutAt
  });

  if (dispatchCandidate) {
    scheduleAckTimeout(sos._id, assignedOfficerUserId);
  }

  const populatedSOS = await getSOSDetails(sos._id);

  // Realtime Broadcasts
  const payload = {
    message: dispatchCandidate
      ? `🚨 EMERGENCY SOS: Dispatched Officer ${dispatchCandidate.officer.userId?.name} (${officerDistKm} km away)`
      : `🚨 ESCALATED SOS: Near ${address || 'coordinates'} - No officer available in radius.`,
    sos: populatedSOS
  };

  sendRealtimeEvent('control-room', 'sos:new', payload);
  if (nearestStation) {
    sendRealtimeEvent(`station:${nearestStation._id}`, 'sos:new', payload);
  }
  if (assignedOfficerUserId) {
    sendRealtimeEvent(`officer:${assignedOfficerUserId}`, 'sos:new', payload);
    sendRealtimeEvent(`officer:${assignedOfficerUserId}`, 'sos:dispatched', payload);

    await createNotificationRecord({
      recipientId: assignedOfficerUserId,
      type: 'SOS',
      title: '🚨 EMERGENCY DISPATCH ASSIGNED',
      message: `You have been dispatched to SOS #${sos.sosId} (${officerDistKm} km away) at ${address || 'coordinates'}.`,
      referenceType: 'SOS',
      referenceId: sos._id
    });
  }

  // Publish async job to RabbitMQ queue
  await publishToQueue(QUEUES.SOS_ALERTS, {
    sos: populatedSOS,
    message: payload.message,
    recipientPhones: dispatchCandidate?.officer?.userId?.phone ? [dispatchCandidate.officer.userId.phone] : []
  });

  // Audit Log
  await logAudit({
    userId: citizenId || null,
    userName: populatedSOS.citizenId?.name || 'Citizen / Anonymous',
    userRole: ROLES.CITIZEN,
    action: dispatchCandidate ? AUDIT_ACTIONS.SOS_DISPATCHED : AUDIT_ACTIONS.SOS_ESCALATED,
    resourceType: 'SOS',
    resourceId: sos.sosId,
    policeStationId: nearestStation ? nearestStation._id : null,
    isCitizenVisible: true,
    citizenSummary: dispatchCandidate
      ? `Emergency SOS triggered near ${address || 'coordinates'}. Responding unit: ${dispatchCandidate.officer.userId?.name}`
      : `Emergency SOS triggered near ${address || 'coordinates'}. Escalated to Central Control Room.`,
    details: `SOS #${sos.sosId} registered at (${lat}, ${lng}). Status: ${sosStatus}`
  });

  return populatedSOS;
};

/**
 * Retrieve SOS list with populated references and computed distances.
 */
/**
 * Retrieve SOS list with populated references and computed distances.
 */
export const getSOSList = async (filter = {}) => {
  const sosList = await SOS.find(filter)
    .populate('citizenId', 'name email phone avatar')
    .populate('nearestStationId', 'name stationCode address location phone')
    .populate('assignedOfficerId', 'name email phone')
    .populate('dispatchedByUserId', 'name email role')
    .populate('rejectedBy.officerId', 'name badgeNumber')
    .populate('dispatchHistory.officerId', 'name badgeNumber')
    .populate('dispatchHistory.dispatchedBy', 'name role')
    .sort({ createdAt: -1 });

  return sosList.map((sosDoc) => {
    const sos = sosDoc.toObject();
    let stationDistanceKm = sos.stationDistanceKm;
    if (stationDistanceKm == null && sos.location && sos.nearestStationId?.location) {
      stationDistanceKm = Number(
        calculateDistance(
          sos.location.latitude,
          sos.location.longitude,
          sos.nearestStationId.location.latitude,
          sos.nearestStationId.location.longitude
        ).toFixed(2)
      );
    }

    return {
      ...sos,
      stationDistanceKm
    };
  });
};

/**
 * Retrieve single SOS details.
 */
export const getSOSDetails = async (id) => {
  const sosDoc = await SOS.findById(id)
    .populate('citizenId', 'name email phone avatar')
    .populate('nearestStationId', 'name stationCode address location phone')
    .populate('assignedOfficerId', 'name email phone')
    .populate('dispatchedByUserId', 'name email role')
    .populate('rejectedBy.officerId', 'name badgeNumber')
    .populate('dispatchHistory.officerId', 'name badgeNumber')
    .populate('dispatchHistory.dispatchedBy', 'name role');

  if (!sosDoc) {
    throw new ApiError(404, 'SOS details not found');
  }

  const sos = sosDoc.toObject();
  let stationDistanceKm = sos.stationDistanceKm;
  if (stationDistanceKm == null && sos.location && sos.nearestStationId?.location) {
    stationDistanceKm = Number(
      calculateDistance(
        sos.location.latitude,
        sos.location.longitude,
        sos.nearestStationId.location.latitude,
        sos.nearestStationId.location.longitude
      ).toFixed(2)
    );
  }

  return {
    ...sos,
    stationDistanceKm
  };
};

/**
 * Officer acknowledges SOS dispatch.
 */
export const acknowledgeSOS = async (sosId, officerUserId) => {
  const sos = await SOS.findById(sosId);
  if (!sos) {
    throw new ApiError(404, 'SOS not found');
  }

  if (sos.status === SOS_STATUS.RESOLVED) {
    throw new ApiError(400, 'SOS is already resolved');
  }

  // Clear timeout timer
  clearAckTimeout(sos._id, officerUserId);

  sos.status = SOS_STATUS.ACKNOWLEDGED;
  sos.acknowledgedAt = new Date();
  sos.ackTimeoutAt = null;

  if (!sos.assignedOfficerId && officerUserId) {
    sos.assignedOfficerId = officerUserId;
  }
  await sos.save();

  // Set officer status to RESPONDING
  if (officerUserId) {
    const officer = await PoliceOfficer.findOne({ userId: officerUserId });
    if (officer) {
      officer.dutyStatus = DUTY_STATUS.RESPONDING;
      await officer.save();
    }
  }

  const updatedSOS = await getSOSDetails(sos._id);
  const payload = { message: `SOS #${sos.sosId} Acknowledged by Unit`, sos: updatedSOS };

  sendRealtimeEvent('control-room', 'sos:updated', payload);
  sendRealtimeEvent('control-room', 'sos:acknowledged', payload);
  if (sos.nearestStationId) {
    sendRealtimeEvent(`station:${sos.nearestStationId._id || sos.nearestStationId}`, 'sos:updated', payload);
  }
  if (sos.citizenId) {
    sendRealtimeEvent(`citizen:${sos.citizenId._id || sos.citizenId}`, 'sos:updated', payload);
  }

  await logAudit({
    userId: officerUserId,
    userName: updatedSOS.assignedOfficerId?.name || 'Officer',
    userRole: 'POLICE',
    action: AUDIT_ACTIONS.SOS_ACKNOWLEDGED,
    resourceType: 'SOS',
    resourceId: sos.sosId,
    policeStationId: sos.nearestStationId?._id || sos.nearestStationId,
    isCitizenVisible: true,
    citizenSummary: `Officer acknowledged your emergency distress beacon and is responding.`,
    details: `Officer acknowledged distress beacon #${sos.sosId}`
  });

  return updatedSOS;
};

/**
 * Officer rejects SOS dispatch or acknowledgement times out.
 * Automatically attempts to find and dispatch the next closest eligible officer.
 */
export const rejectSOS = async (sosId, officerUserId, reason = 'Officer unavailable or rejected') => {
  const sos = await SOS.findById(sosId);
  if (!sos) {
    throw new ApiError(404, 'SOS not found');
  }

  if (sos.status === SOS_STATUS.RESOLVED) {
    throw new ApiError(400, 'SOS is already resolved');
  }

  clearAckTimeout(sos._id, officerUserId);

  // 1. Free the rejecting officer
  if (officerUserId) {
    const officer = await PoliceOfficer.findOne({ userId: officerUserId });
    if (officer) {
      officer.dutyStatus = DUTY_STATUS.AVAILABLE;
      await officer.save();
    }
  }

  // 2. Record rejection in SOS history
  sos.rejectedBy.push({
    officerId: officerUserId || null,
    reason: reason || 'Officer declined assignment',
    rejectedAt: new Date()
  });

  // 3. Collect all excluded officer IDs for this SOS
  const excludedIds = sos.rejectedBy.map((r) => r.officerId).filter(Boolean);

  // 4. Search for next best officer
  const nextCandidate = await findBestOfficerForSOS(
    sos.location.latitude,
    sos.location.longitude,
    { excludedOfficerUserIds: excludedIds }
  );

  const now = new Date();

  if (nextCandidate) {
    const nextOfficer = nextCandidate.officer;
    const nextOfficerUserId = nextOfficer.userId._id;

    sos.assignedOfficerId = nextOfficerUserId;
    sos.status = SOS_STATUS.DISPATCHED;
    sos.dispatchedAt = now;
    sos.officerDistanceKm = nextCandidate.distanceKm;
    sos.ackTimeoutAt = new Date(now.getTime() + env.sosAckTimeoutSeconds * 1000);
    sos.dispatchHistory.push({
      officerId: nextOfficerUserId,
      dispatchedAt: now,
      status: 'DISPATCHED'
    });
    await sos.save();

    nextOfficer.dutyStatus = DUTY_STATUS.BUSY;
    await nextOfficer.save();

    scheduleAckTimeout(sos._id, nextOfficerUserId);

    const updatedSOS = await getSOSDetails(sos._id);
    const payload = {
      message: `SOS #${sos.sosId} re-dispatched to Officer ${nextOfficer.userId?.name} (${nextCandidate.distanceKm} km away)`,
      sos: updatedSOS
    };

    sendRealtimeEvent('control-room', 'sos:updated', payload);
    sendRealtimeEvent('control-room', 'sos:dispatched', payload);
    if (sos.nearestStationId) {
      sendRealtimeEvent(`station:${sos.nearestStationId._id || sos.nearestStationId}`, 'sos:updated', payload);
    }
    sendRealtimeEvent(`officer:${nextOfficerUserId}`, 'sos:new', payload);
    sendRealtimeEvent(`officer:${nextOfficerUserId}`, 'sos:dispatched', payload);

    await createNotificationRecord({
      recipientId: nextOfficerUserId,
      type: 'SOS',
      title: '🚨 EMERGENCY DISPATCH RE-ASSIGNED',
      message: `You have been dispatched to SOS #${sos.sosId} at ${sos.location?.address || 'coordinates'}.`,
      referenceType: 'SOS',
      referenceId: sos._id
    });

    await logAudit({
      userId: officerUserId || null,
      userName: 'Dispatch Auto-Rerouter',
      userRole: 'SYSTEM',
      action: AUDIT_ACTIONS.SOS_REJECTED,
      resourceType: 'SOS',
      resourceId: sos.sosId,
      policeStationId: sos.nearestStationId?._id || sos.nearestStationId,
      isCitizenVisible: true,
      citizenSummary: `Response unit updated to nearest available officer: ${nextOfficer.userId?.name}`,
      details: `SOS #${sos.sosId} rejected by previous unit. Re-dispatched to Officer ${nextOfficer.userId?.name}`
    });

    return updatedSOS;
  } else {
    // Escalate to Control Room
    sos.status = SOS_STATUS.ESCALATED;
    sos.assignedOfficerId = null;
    sos.officerDistanceKm = null;
    sos.ackTimeoutAt = null;
    sos.escalationReason = `Previous unit rejected assignment (${reason}) and no alternative officers available within search radius.`;
    await sos.save();

    const updatedSOS = await getSOSDetails(sos._id);
    const payload = {
      message: `CRITICAL ESCALATION: SOS #${sos.sosId} has no available units. Control Room action required.`,
      sos: updatedSOS
    };

    sendRealtimeEvent('control-room', 'sos:updated', payload);
    sendRealtimeEvent('control-room', 'sos:escalated', payload);
    if (sos.nearestStationId) {
      sendRealtimeEvent(`station:${sos.nearestStationId._id || sos.nearestStationId}`, 'sos:updated', payload);
    }

    await logAudit({
      userId: officerUserId || null,
      userName: 'Dispatch System',
      userRole: 'SYSTEM',
      action: AUDIT_ACTIONS.SOS_ESCALATED,
      resourceType: 'SOS',
      resourceId: sos.sosId,
      policeStationId: sos.nearestStationId?._id || sos.nearestStationId,
      isCitizenVisible: true,
      citizenSummary: `SOS escalated to Central Command for high-priority dispatch.`,
      details: `SOS #${sos.sosId} escalated: ${sos.escalationReason}`
    });

    return updatedSOS;
  }
};

/**
 * Handle acknowledgement timeout for a dispatched officer.
 */
export const handleAckTimeout = async (sosId, officerUserId) => {
  const sos = await SOS.findById(sosId);
  if (!sos) return;

  // If already acknowledged, resolved, or re-assigned, do nothing
  if (sos.status !== SOS_STATUS.DISPATCHED) return;
  if (sos.assignedOfficerId && sos.assignedOfficerId.toString() !== officerUserId.toString()) return;

  console.log(`[SOS-TIMEOUT] Officer ${officerUserId} did not acknowledge SOS ${sos.sosId} within timeout. Triggering re-dispatch...`);
  await rejectSOS(sosId, officerUserId, 'Acknowledgement timeout expired');
};

/**
 * Role-aware manual dispatch by Admin or Station Head.
 * Options: { isPersonalResponse: boolean, dispatchNote: string }
 */
export const dispatchSOS = async (sosId, officerUserId, dispatcherUser = null, options = {}) => {
  const sos = await SOS.findById(sosId);
  if (!sos) {
    throw new ApiError(404, 'SOS not found');
  }

  if (sos.status === SOS_STATUS.RESOLVED) {
    throw new ApiError(400, 'Cannot dispatch an already resolved SOS incident');
  }

  const isPersonalResponse = typeof options === 'boolean' ? options : Boolean(options?.isPersonalResponse);
  const dispatchNote = (typeof options === 'object' && options?.dispatchNote) ? options.dispatchNote.trim() : '';

  let assignedTargetUserId = officerUserId;
  clearAckTimeout(sos._id);

  // 1. Station Head Dispatch Rules
  if (dispatcherUser && dispatcherUser.role === ROLES.STATION_HEAD) {
    const stationHeadOfficer = await PoliceOfficer.findOne({ userId: dispatcherUser._id });
    if (!stationHeadOfficer || !stationHeadOfficer.stationId) {
      throw new ApiError(403, 'Station Head has no assigned police station in records');
    }

    if (isPersonalResponse) {
      // Option A: Station Head dispatches themselves
      if (stationHeadOfficer.dutyStatus === DUTY_STATUS.OFF_DUTY) {
        throw new ApiError(400, 'Cannot self-dispatch while marked OFF_DUTY. Please switch to available duty status first.');
      }
      assignedTargetUserId = dispatcherUser._id;
      sos.isStationHeadPersonalResponse = true;
      stationHeadOfficer.dutyStatus = DUTY_STATUS.RESPONDING;
      await stationHeadOfficer.save();
    } else {
      // Option B: Station Head dispatches officer from their own station
      if (!officerUserId) {
        throw new ApiError(400, 'Please select an officer from your station to dispatch');
      }
      const targetOfficer = await PoliceOfficer.findOne({ userId: officerUserId });
      if (!targetOfficer || !targetOfficer.stationId || targetOfficer.stationId.toString() !== stationHeadOfficer.stationId.toString()) {
        throw new ApiError(403, 'Station Heads can only dispatch officers belonging to their own police station');
      }
      if (targetOfficer.dutyStatus === DUTY_STATUS.OFF_DUTY) {
        throw new ApiError(400, 'Selected officer is currently marked OFF_DUTY and unavailable for emergency dispatch');
      }
      targetOfficer.dutyStatus = DUTY_STATUS.BUSY;
      await targetOfficer.save();
      sos.isStationHeadPersonalResponse = false;
    }
  } else if (dispatcherUser && dispatcherUser.role === ROLES.CONTROL_ROOM_ADMIN) {
    // 2. Control Room Admin Central Dispatch (can assign from ANY station)
    sos.isStationHeadPersonalResponse = false;
    if (officerUserId) {
      const targetOfficer = await PoliceOfficer.findOne({ userId: officerUserId });
      if (targetOfficer) {
        if (targetOfficer.dutyStatus === DUTY_STATUS.OFF_DUTY) {
          throw new ApiError(400, 'Selected officer is currently marked OFF_DUTY');
        }
        targetOfficer.dutyStatus = DUTY_STATUS.BUSY;
        await targetOfficer.save();
      }
    }
  } else if (officerUserId) {
    const officer = await PoliceOfficer.findOne({ userId: officerUserId });
    if (officer) {
      officer.dutyStatus = DUTY_STATUS.BUSY;
      await officer.save();
    }
  }

  const now = new Date();
  sos.status = isPersonalResponse ? SOS_STATUS.ACKNOWLEDGED : SOS_STATUS.DISPATCHED;
  sos.dispatchedAt = now;
  sos.escalationReason = '';
  sos.dispatchedByUserId = dispatcherUser?._id || null;
  sos.dispatchNote = dispatchNote;

  if (isPersonalResponse) {
    sos.acknowledgedAt = now;
  }

  if (assignedTargetUserId) {
    sos.assignedOfficerId = assignedTargetUserId;
    if (!isPersonalResponse) {
      sos.ackTimeoutAt = new Date(now.getTime() + env.sosAckTimeoutSeconds * 1000);
    } else {
      sos.ackTimeoutAt = null;
    }

    sos.dispatchHistory.push({
      officerId: assignedTargetUserId,
      dispatchedBy: dispatcherUser?._id || null,
      dispatchedAt: now,
      status: isPersonalResponse ? 'SELF_DISPATCHED' : 'DISPATCHED',
      note: dispatchNote
    });

    const offDoc = await PoliceOfficer.findOne({ userId: assignedTargetUserId });
    if (offDoc?.currentLocation?.latitude && sos.location?.latitude) {
      sos.officerDistanceKm = Number(
        calculateDistance(
          sos.location.latitude,
          sos.location.longitude,
          offDoc.currentLocation.latitude,
          offDoc.currentLocation.longitude
        ).toFixed(2)
      );
    }

    if (!isPersonalResponse) {
      scheduleAckTimeout(sos._id, assignedTargetUserId);
    }
  }
  await sos.save();

  const updatedSOS = await getSOSDetails(sos._id);
  const payload = {
    message: isPersonalResponse
      ? `Station Head ${dispatcherUser?.name} dispatched themselves for emergency response`
      : `SOS Dispatched to ${updatedSOS.assignedOfficerId?.name || 'Officer'}`,
    sos: updatedSOS
  };

  sendRealtimeEvent('control-room', 'sos:updated', payload);
  sendRealtimeEvent('control-room', 'sos:dispatched', payload);

  if (sos.nearestStationId) {
    sendRealtimeEvent(`station:${sos.nearestStationId._id || sos.nearestStationId}`, 'sos:updated', payload);
  }
  if (assignedTargetUserId) {
    sendRealtimeEvent(`officer:${assignedTargetUserId}`, 'sos:updated', payload);
    sendRealtimeEvent(`officer:${assignedTargetUserId}`, 'sos:dispatched', payload);

    await createNotificationRecord({
      recipientId: assignedTargetUserId,
      type: 'SOS',
      title: '🚨 EMERGENCY DISPATCH ASSIGNED',
      message: `You have been dispatched to SOS #${updatedSOS.sosId} at ${updatedSOS.location?.address || 'coordinates'}.${dispatchNote ? ` Note: ${dispatchNote}` : ''}`,
      referenceType: 'SOS',
      referenceId: sos._id
    });
  }

  await logAudit({
    userId: dispatcherUser?._id || assignedTargetUserId,
    userName: dispatcherUser?.name || 'Dispatcher',
    userRole: dispatcherUser?.role || 'CONTROL_ROOM_ADMIN',
    action: AUDIT_ACTIONS.SOS_DISPATCHED,
    resourceType: 'SOS',
    resourceId: sos.sosId,
    policeStationId: sos.nearestStationId?._id || sos.nearestStationId,
    isCitizenVisible: true,
    citizenSummary: isPersonalResponse 
      ? `Station Head is responding personally to your SOS location.`
      : `Emergency response unit dispatched to your location.`,
    details: `Dispatched unit to SOS #${sos.sosId} by ${dispatcherUser?.name || 'System'}${dispatchNote ? ` (Note: ${dispatchNote})` : ''}`
  });

  return updatedSOS;
};

/**
 * Mark officer en route to SOS location.
 */
export const markEnRoute = async (sosId, officerUserId) => {
  const sos = await SOS.findById(sosId);
  if (!sos) {
    throw new ApiError(404, 'SOS not found');
  }

  if (sos.status === SOS_STATUS.RESOLVED) {
    throw new ApiError(400, 'SOS is already resolved');
  }

  clearAckTimeout(sos._id, officerUserId);

  sos.status = SOS_STATUS.EN_ROUTE;
  sos.enRouteAt = new Date();
  if (!sos.acknowledgedAt) {
    sos.acknowledgedAt = new Date();
  }
  await sos.save();

  if (officerUserId) {
    const officer = await PoliceOfficer.findOne({ userId: officerUserId });
    if (officer) {
      officer.dutyStatus = DUTY_STATUS.RESPONDING;
      await officer.save();
    }
  }

  const updatedSOS = await getSOSDetails(sos._id);
  const payload = { message: 'Officer En Route to SOS Location', sos: updatedSOS };
  sendRealtimeEvent('control-room', 'sos:updated', payload);
  sendRealtimeEvent('control-room', 'sos:enRoute', payload);
  if (sos.nearestStationId) {
    sendRealtimeEvent(`station:${sos.nearestStationId._id || sos.nearestStationId}`, 'sos:updated', payload);
  }
  if (sos.citizenId) {
    sendRealtimeEvent(`citizen:${sos.citizenId._id || sos.citizenId}`, 'sos:updated', payload);
  }

  await logAudit({
    userId: officerUserId,
    userName: updatedSOS.assignedOfficerId?.name || 'Officer',
    userRole: 'POLICE',
    action: AUDIT_ACTIONS.SOS_EN_ROUTE,
    resourceType: 'SOS',
    resourceId: sos.sosId,
    policeStationId: sos.nearestStationId?._id || sos.nearestStationId,
    isCitizenVisible: true,
    citizenSummary: `Responding police officer is en route to your location.`,
    details: `Officer marked EN_ROUTE for SOS #${sos.sosId}`
  });

  return updatedSOS;
};

/**
 * Mark officer arrival at SOS scene.
 */
export const markArrived = async (sosId, officerUserId) => {
  const sos = await SOS.findById(sosId);
  if (!sos) {
    throw new ApiError(404, 'SOS not found');
  }

  if (sos.status === SOS_STATUS.RESOLVED) {
    throw new ApiError(400, 'SOS is already resolved');
  }

  sos.status = SOS_STATUS.ARRIVED;
  sos.arrivedAt = new Date();
  await sos.save();

  const updatedSOS = await getSOSDetails(sos._id);
  const payload = { message: 'Officer Arrived at SOS Scene', sos: updatedSOS };
  sendRealtimeEvent('control-room', 'sos:updated', payload);
  sendRealtimeEvent('control-room', 'sos:arrived', payload);
  if (sos.nearestStationId) {
    sendRealtimeEvent(`station:${sos.nearestStationId._id || sos.nearestStationId}`, 'sos:updated', payload);
  }
  if (sos.citizenId) {
    sendRealtimeEvent(`citizen:${sos.citizenId._id || sos.citizenId}`, 'sos:updated', payload);
  }

  await logAudit({
    userId: officerUserId,
    userName: updatedSOS.assignedOfficerId?.name || 'Officer',
    userRole: 'POLICE',
    action: AUDIT_ACTIONS.SOS_ARRIVED,
    resourceType: 'SOS',
    resourceId: sos.sosId,
    policeStationId: sos.nearestStationId?._id || sos.nearestStationId,
    isCitizenVisible: true,
    citizenSummary: `Police response unit has arrived at the emergency scene.`,
    details: `Officer confirmed arrival at SOS #${sos.sosId}`
  });

  return updatedSOS;
};

/**
 * Resolve SOS distress alert.
 */
export const resolveSOS = async (sosId, summary = '') => {
  const sos = await SOS.findById(sosId);
  if (!sos) {
    throw new ApiError(404, 'SOS not found');
  }

  clearAckTimeout(sos._id);

  if (sos.assignedOfficerId) {
    const officer = await PoliceOfficer.findOne({ userId: sos.assignedOfficerId });
    if (officer) {
      officer.dutyStatus = DUTY_STATUS.AVAILABLE;
      await officer.save();
    }
  }

  sos.status = SOS_STATUS.RESOLVED;
  sos.resolvedAt = new Date();
  sos.ackTimeoutAt = null;
  sos.resolutionSummary = summary || 'Distress beacon resolved by responding officers.';
  await sos.save();

  const updatedSOS = await getSOSDetails(sos._id);
  const payload = { message: 'SOS Resolved', sos: updatedSOS };
  sendRealtimeEvent('control-room', 'sos:updated', payload);
  sendRealtimeEvent('control-room', 'sos:resolved', payload);
  if (sos.nearestStationId) {
    sendRealtimeEvent(`station:${sos.nearestStationId._id || sos.nearestStationId}`, 'sos:updated', payload);
  }
  if (sos.citizenId) {
    sendRealtimeEvent(`citizen:${sos.citizenId._id || sos.citizenId}`, 'sos:updated', payload);
  }

  await logAudit({
    userId: sos.assignedOfficerId || null,
    userName: 'Officer / Dispatcher',
    userRole: 'POLICE',
    action: AUDIT_ACTIONS.SOS_RESOLVED,
    resourceType: 'SOS',
    resourceId: sos.sosId,
    policeStationId: sos.nearestStationId?._id || sos.nearestStationId,
    isCitizenVisible: true,
    citizenSummary: `Emergency incident resolved. Summary: ${sos.resolutionSummary}`,
    details: `SOS #${sos.sosId} resolved at ${sos.resolvedAt}`
  });

  return updatedSOS;
};

/**
 * Explicit manual escalation of SOS.
 */
export const escalateSOS = async (sosId, reason = '') => {
  const sos = await SOS.findById(sosId);
  if (!sos) {
    throw new ApiError(404, 'SOS not found');
  }

  clearAckTimeout(sos._id);

  sos.status = SOS_STATUS.ESCALATED;
  sos.escalationReason = reason || 'Escalated by station / control room operator';
  sos.ackTimeoutAt = null;
  await sos.save();

  const otherStations = await PoliceStation.find({
    status: 'ACTIVE',
    _id: { $ne: sos.nearestStationId }
  });

  const updatedSOS = await getSOSDetails(sos._id);
  const payload = {
    message: `CRITICAL ALERT: SOS ID ${sos.sosId} has been ESCALATED! ${reason}`,
    sos: updatedSOS
  };

  sendRealtimeEvent('control-room', 'sos:updated', payload);
  sendRealtimeEvent('control-room', 'sos:escalated', payload);
  otherStations.forEach((station) => {
    sendRealtimeEvent(`station:${station._id}`, 'sos:updated', payload);
  });

  await logAudit({
    userId: null,
    userName: 'Control Room / Auto Escalator',
    userRole: 'CONTROL_ROOM_ADMIN',
    action: AUDIT_ACTIONS.SOS_ESCALATED,
    resourceType: 'SOS',
    resourceId: sos.sosId,
    policeStationId: sos.nearestStationId?._id || sos.nearestStationId,
    isCitizenVisible: true,
    citizenSummary: `SOS alert escalated to Central Command for high-priority dispatch`,
    details: `SOS #${sos.sosId} escalated: ${sos.escalationReason}`
  });

  return updatedSOS;
};
