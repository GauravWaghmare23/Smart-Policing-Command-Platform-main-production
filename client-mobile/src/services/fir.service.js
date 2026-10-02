import apiClient, { isValidObjectId } from './apiClient';

export const getMyFIRs = async () => {
  const res = await apiClient.get('/firs');
  const data = res.data;
  return data?.data?.firs || data?.firs || (Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
};

export const getFIRById = async (id) => {
  if (!id || !isValidObjectId(id)) {
    throw new Error('Invalid or missing MongoDB ObjectId for FIR');
  }
  const res = await apiClient.get(`/firs/${id}`);
  const data = res.data;
  return data?.data?.fir || data?.fir || data;
};
