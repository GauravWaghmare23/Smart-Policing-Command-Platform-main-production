import apiClient, { isValidObjectId } from './apiClient';

export const getPoliceStations = async () => {
  const res = await apiClient.get('/stations');
  const data = res.data;
  return data?.data?.stations || data?.stations || (Array.isArray(data) ? data : []);
};

export const getPoliceStationById = async (id) => {
  if (!id || !isValidObjectId(id)) {
    throw new Error('Invalid or missing MongoDB ObjectId for Police Station');
  }
  const res = await apiClient.get(`/stations/${id}`);
  const data = res.data;
  return data?.data?.station || data?.station || data;
};
