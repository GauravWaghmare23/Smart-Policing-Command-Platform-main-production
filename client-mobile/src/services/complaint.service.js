import apiClient, { isValidObjectId } from './apiClient';

export const getMyComplaints = async () => {
  const res = await apiClient.get('/complaints');
  const data = res.data;
  return data?.data?.complaints || data?.complaints || (Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
};

export const createComplaint = async (complaintData) => {
  const res = await apiClient.post('/complaints', complaintData);
  const data = res.data;
  return data?.data?.complaint || data?.complaint || data;
};

export const getComplaintById = async (id) => {
  if (!id || !isValidObjectId(id)) {
    throw new Error('Invalid or missing MongoDB ObjectId for complaint');
  }
  const res = await apiClient.get(`/complaints/${id}`);
  const data = res.data;
  return data?.data?.complaint || data?.complaint || data;
};
