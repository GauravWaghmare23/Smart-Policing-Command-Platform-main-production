import PoliceStation from '../models/PoliceStation.js';
import PoliceOfficer from '../models/PoliceOfficer.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { ROLES } from '../utils/constants.js';

export const createStation = async (stationData) => {
  const station = await PoliceStation.create(stationData);
  return station;
};

export const getStationsList = async (filter = {}) => {
  return await PoliceStation.find(filter).populate({
    path: 'stationHeadId',
    select: 'name email phone avatar'
  });
};

export const getStationDetails = async (stationId) => {
  const station = await PoliceStation.findById(stationId).populate({
    path: 'stationHeadId',
    select: 'name email phone avatar'
  });
  if (!station) {
    throw new ApiError(404, 'Police station not found');
  }
  return station;
};

export const updateStationDetails = async (stationId, updateData) => {
  const station = await PoliceStation.findById(stationId);
  if (!station) {
    throw new ApiError(404, 'Police station not found');
  }
  
  // Update fields
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] !== undefined) {
      station[key] = updateData[key];
    }
  });
  
  await station.save();
  return station;
};

export const assignStationHead = async (stationId, officerUserId) => {
  const station = await PoliceStation.findById(stationId);
  if (!station) {
    throw new ApiError(404, 'Police station not found');
  }
  
  const officerUser = await User.findById(officerUserId);
  if (!officerUser) {
    throw new ApiError(404, 'Officer user not found');
  }
  
  const officerDetails = await PoliceOfficer.findOne({ userId: officerUserId });
  if (!officerDetails) {
    throw new ApiError(400, 'User is not registered as a police officer');
  }
  
  // Set officer role to STATION_HEAD
  officerUser.role = ROLES.STATION_HEAD;
  await officerUser.save();
  
  officerDetails.role = ROLES.STATION_HEAD;
  officerDetails.stationId = stationId;
  await officerDetails.save();
  
  // Update station head
  station.stationHeadId = officerUserId;
  await station.save();
  
  return station;
};
