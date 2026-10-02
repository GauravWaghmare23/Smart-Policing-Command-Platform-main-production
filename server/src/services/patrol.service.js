import Patrol from '../models/Patrol.js';
import PoliceOfficer from '../models/PoliceOfficer.js';
import PoliceStation from '../models/PoliceStation.js';
import ApiError from '../utils/ApiError.js';
import { generateUniqueId } from '../utils/generateId.js';
import { PATROL_STATUS, DUTY_STATUS, AUDIT_ACTIONS } from '../utils/constants.js';
import { calculateHotspots } from './hotspot.service.js';
import { generatePatrolPlanAI } from './ai.service.js';
import { getRouteDirections } from './maps.service.js';
import { createNotificationRecord } from './notification.service.js';
import { sendRealtimeEvent } from '../sockets/socket.js';
import { calculateDistance } from '../utils/distance.js';
import { logAudit } from '../middleware/auditLog.middleware.js';

export const PATROL_RADIUS_KM = 3;

export const generatePatrolPlan = async (stationId, createdByUserId) => {
  const station = await PoliceStation.findById(stationId);
  if (!station) {
    throw new ApiError(404, 'Station not found');
  }
  
  let officers = await PoliceOfficer.find({
    stationId,
    dutyStatus: { $in: [DUTY_STATUS.AVAILABLE, DUTY_STATUS.ON_DUTY] }
  }).populate('userId', 'name');
  
  if (officers.length === 0) {
    officers = await PoliceOfficer.find({ stationId }).populate('userId', 'name');
  }

  if (officers.length === 0) {
    throw new ApiError(400, `No registered officers found in ${station.name} to plan patrol`);
  }
  
  // Sort officers by distance to station
  officers.sort((a, b) => {
    const locA = a.currentLocation?.latitude ? a.currentLocation : station.location;
    const locB = b.currentLocation?.latitude ? b.currentLocation : station.location;
    const distA = calculateDistance(station.location.latitude, station.location.longitude, locA.latitude, locA.longitude);
    const distB = calculateDistance(station.location.latitude, station.location.longitude, locB.latitude, locB.longitude);
    return distA - distB;
  });

  const hotspots = await calculateHotspots(station.location, PATROL_RADIUS_KM);
  const plan = await generatePatrolPlanAI(station, hotspots, officers, PATROL_RADIUS_KM);
  
  const waypoints = [
    {
      name: station.name,
      latitude: station.location.latitude,
      longitude: station.location.longitude
    }
  ];

  plan.priorityAreas.forEach((areaName) => {
    const matched = hotspots.find(h => h.name === areaName);
    if (matched) {
      waypoints.push({
        name: matched.name,
        latitude: matched.latitude,
        longitude: matched.longitude
      });
    }
  });
  
  if (waypoints.length === 1) {
    waypoints.push({
      name: `${station.name} Sector North`,
      latitude: Number((station.location.latitude + 0.005).toFixed(4)),
      longitude: Number((station.location.longitude + 0.005).toFixed(4))
    });
    waypoints.push({
      name: `${station.name} Market Area`,
      latitude: Number((station.location.latitude - 0.004).toFixed(4)),
      longitude: Number((station.location.longitude + 0.003).toFixed(4))
    });
  }
  
  const routeDetails = await getRouteDirections(station.location, waypoints);
  const patrolId = generateUniqueId('PTR');
  
  const assignedOfficerUserIds = plan.assignedOfficers.map((id) => {
    const foundOff = officers.find(o => o._id.toString() === id.toString() || o.userId?._id?.toString() === id.toString());
    return foundOff ? foundOff.userId._id : id;
  });
  
  const patrol = await Patrol.create({
    patrolId,
    stationId,
    officerIds: assignedOfficerUserIds,
    route: {
      waypoints,
      distance: routeDetails.distance,
      duration: routeDetails.duration,
      encodedPolyline: routeDetails.encodedPolyline
    },
    priority: 'HIGH',
    status: PATROL_STATUS.PLANNED,
    aiGenerated: true,
    reason: plan.reason,
    createdBy: createdByUserId
  });
  
  for (const officerUserId of assignedOfficerUserIds) {
    await createNotificationRecord({
      recipientId: officerUserId,
      type: 'PATROL',
      title: `Patrol Assigned: ${station.name}`,
      message: `You have been assigned to AI patrol route ${patrolId}. Reason: ${plan.reason}`,
      referenceType: 'PATROL',
      referenceId: patrol._id
    });
  }
  
  sendRealtimeEvent(`station:${stationId}`, 'notification:new', {
    message: `New AI Patrol Plan generated for ${station.name}: ${patrolId}`
  });
  
  return patrol;
};

export const updatePatrolStatus = async (id, status, user = null) => {
  const patrol = await Patrol.findById(id);
  if (!patrol) {
    throw new ApiError(404, 'Patrol not found');
  }
  
  patrol.status = status;
  if (status === PATROL_STATUS.ACTIVE && !patrol.startTime) {
    patrol.startTime = new Date();
    await PoliceOfficer.updateMany(
      { userId: { $in: patrol.officerIds } },
      { $set: { dutyStatus: DUTY_STATUS.ON_DUTY } }
    );
  } else if (status === PATROL_STATUS.COMPLETED || status === PATROL_STATUS.CANCELLED) {
    patrol.endTime = new Date();
    await PoliceOfficer.updateMany(
      { userId: { $in: patrol.officerIds } },
      { $set: { dutyStatus: DUTY_STATUS.AVAILABLE } }
    );
  }
  
  await patrol.save();

  sendRealtimeEvent('control-room', 'patrol:updated', { patrol });
  sendRealtimeEvent(`station:${patrol.stationId}`, 'patrol:updated', { patrol });

  await logAudit({
    userId: user?._id || patrol.createdBy,
    userName: user?.name || 'Officer',
    userRole: user?.role || 'POLICE',
    action: status === PATROL_STATUS.ACTIVE ? AUDIT_ACTIONS.PATROL_STARTED : status === PATROL_STATUS.COMPLETED ? AUDIT_ACTIONS.PATROL_COMPLETED : 'PATROL_UPDATED',
    resourceType: 'Patrol',
    resourceId: patrol.patrolId,
    policeStationId: patrol.stationId,
    isCitizenVisible: false,
    details: `Patrol #${patrol.patrolId} status updated to ${status}`
  });
  
  return patrol;
};

export const addPatrolBreadcrumb = async (patrolId, { latitude, longitude, accuracy }) => {
  const patrol = await Patrol.findById(patrolId);
  if (!patrol) {
    throw new ApiError(404, 'Patrol not found');
  }

  const breadcrumb = { latitude, longitude, accuracy: accuracy || 0, timestamp: new Date() };
  patrol.actualPath.push(breadcrumb);
  patrol.currentLocation = { latitude, longitude, accuracy: accuracy || 0, lastUpdate: new Date() };

  // Calculate distance travelled incrementally
  if (patrol.actualPath.length > 1) {
    const prev = patrol.actualPath[patrol.actualPath.length - 2];
    const segmentKm = calculateDistance(prev.latitude, prev.longitude, latitude, longitude);
    patrol.distanceTravelledKm = Number(((patrol.distanceTravelledKm || 0) + segmentKm).toFixed(2));
    
    if (patrol.route?.distance > 0) {
      patrol.progressPercent = Math.min(100, Math.round((patrol.distanceTravelledKm / patrol.route.distance) * 100));
    }
  }

  await patrol.save();

  const payload = {
    patrolId: patrol._id,
    patrolCode: patrol.patrolId,
    currentLocation: patrol.currentLocation,
    actualPath: patrol.actualPath,
    distanceTravelledKm: patrol.distanceTravelledKm,
    progressPercent: patrol.progressPercent
  };

  sendRealtimeEvent('control-room', 'patrol:progress', payload);
  sendRealtimeEvent(`station:${patrol.stationId}`, 'patrol:progress', payload);

  return payload;
};
