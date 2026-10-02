import User from '../models/User.js';
import PoliceOfficer from '../models/PoliceOfficer.js';
import PoliceStation from '../models/PoliceStation.js';
import ApiError from '../utils/ApiError.js';
import { USER_STATUS } from '../utils/constants.js';

export const createOfficerProfile = async (officerData) => {
  const { name, email, phone, password, stationId, badgeNumber, rank, role } = officerData;
  
  // 1. Validate station
  if (stationId) {
    const station = await PoliceStation.findById(stationId);
    if (!station) {
      throw new ApiError(404, 'Police station not found');
    }
  }
  
  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, 'User with this email already exists');
  }
  
  // Check if badge exists
  const existingBadge = await PoliceOfficer.findOne({ badgeNumber });
  if (existingBadge) {
    throw new ApiError(400, 'Badge number already assigned');
  }
  
  // 2. Create User
  const user = await User.create({
    name,
    email,
    phone,
    password,
    role, // STATION_HEAD, INVESTIGATING_OFFICER, FIELD_OFFICER
    status: USER_STATUS.ACTIVE
  });
  
  // 3. Create Police Officer details
  const officer = await PoliceOfficer.create({
    userId: user._id,
    stationId: stationId || null,
    badgeNumber,
    rank,
    role
  });
  
  const userObj = user.toObject();
  delete userObj.password;
  
  return {
    user: userObj,
    officerDetails: officer
  };
};

export const getOfficersList = async (filter = {}) => {
  return await PoliceOfficer.find(filter)
    .populate({
      path: 'userId',
      select: 'name email phone status avatar'
    })
    .populate('stationId', 'name stationCode');
};

export const getOfficerDetails = async (officerId) => {
  const officer = await PoliceOfficer.findById(officerId)
    .populate({
      path: 'userId',
      select: 'name email phone status avatar'
    })
    .populate('stationId', 'name stationCode');
  
  if (!officer) {
    throw new ApiError(404, 'Officer profile not found');
  }
  return officer;
};

export const transferOfficer = async (officerId, destinationStationId) => {
  const officer = await PoliceOfficer.findById(officerId);
  if (!officer) {
    throw new ApiError(404, 'Officer not found');
  }
  
  const station = await PoliceStation.findById(destinationStationId);
  if (!station) {
    throw new ApiError(404, 'Destination police station not found');
  }
  
  officer.stationId = destinationStationId;
  await officer.save();
  return officer;
};

export const isOfficerLocationFresh = (officer, freshnessMinutes = 10) => {
  if (!officer?.currentLocation?.latitude || !officer?.currentLocation?.longitude || !officer?.lastLocationUpdate) {
    return false;
  }
  const maxAgeMs = freshnessMinutes * 60 * 1000;
  const ageMs = Date.now() - new Date(officer.lastLocationUpdate).getTime();
  return ageMs >= 0 && ageMs <= maxAgeMs;
};

export const updateOfficerLocation = async (officerUserId, latitude, longitude, isSimulated = false) => {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (isNaN(lat) || lat < -90 || lat > 90) {
    throw new ApiError(400, 'Invalid latitude. Must be a number between -90 and 90.');
  }
  if (isNaN(lng) || lng < -180 || lng > 180) {
    throw new ApiError(400, 'Invalid longitude. Must be a number between -180 and 180.');
  }

  const officer = await PoliceOfficer.findOne({ userId: officerUserId });
  if (!officer) {
    throw new ApiError(404, 'Officer profile not found for this user');
  }
  
  officer.currentLocation = { 
    latitude: lat, 
    longitude: lng,
    isSimulated: Boolean(isSimulated)
  };
  officer.lastLocationUpdate = new Date();
  await officer.save();

  const populated = await PoliceOfficer.findById(officer._id)
    .populate({
      path: 'userId',
      select: 'name email phone status avatar'
    })
    .populate('stationId', 'name stationCode address location phone');
  
  return populated;
};

export const clearOfficerLocation = async (officerUserId) => {
  const officer = await PoliceOfficer.findOne({ userId: officerUserId });
  if (!officer) {
    throw new ApiError(404, 'Officer profile not found');
  }
  
  officer.currentLocation = { latitude: null, longitude: null, isSimulated: false };
  officer.lastLocationUpdate = null;
  await officer.save();
  return officer;
};

export const updateOfficerStatus = async (officerUserId, dutyStatus) => {
  const officer = await PoliceOfficer.findOne({ userId: officerUserId });
  if (!officer) {
    throw new ApiError(404, 'Officer profile not found');
  }
  
  officer.dutyStatus = dutyStatus;
  await officer.save();
  return officer;
};
