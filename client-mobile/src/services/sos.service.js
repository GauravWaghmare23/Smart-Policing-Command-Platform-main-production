import apiClient, { isValidObjectId } from './apiClient';

export const createSOSAlert = async ({ latitude, longitude, address, description }) => {
  const res = await apiClient.post('/sos', {
    latitude,
    longitude,
    address,
    description: description || 'Emergency SOS alert sent from Citizen Mobile Application',
  });
  const data = res.data;
  return data?.data?.sos || data?.sos || data;
};

export const getMySOSHistory = async () => {
  const res = await apiClient.get('/sos');
  const data = res.data;
  return data?.data?.sosList || data?.data?.sosHistory || data?.data?.sos || data?.sosList || (Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
};

export const getSOSById = async (id) => {
  if (!id || !isValidObjectId(id)) {
    throw new Error('Invalid or missing MongoDB ObjectId for SOS');
  }
  const res = await apiClient.get(`/sos/${id}`);
  const data = res.data;
  return data?.data?.sos || data?.sos || data;
};

export const acknowledgeSOS = async (id) => {
  if (!id || !isValidObjectId(id)) {
    throw new Error('Invalid or missing MongoDB ObjectId for SOS');
  }
  const res = await apiClient.patch(`/sos/${id}/acknowledge`);
  const data = res.data;
  return data?.data?.sos || data?.sos || data;
};

export const rejectSOS = async (id, reason = '') => {
  if (!id || !isValidObjectId(id)) {
    throw new Error('Invalid or missing MongoDB ObjectId for SOS');
  }
  const res = await apiClient.patch(`/sos/${id}/reject`, { reason });
  const data = res.data;
  return data?.data?.sos || data?.sos || data;
};
