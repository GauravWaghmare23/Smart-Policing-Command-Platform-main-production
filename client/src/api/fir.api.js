import api from './axios';

export const firApi = {
  getAll: async () => {
    const res = await api.get('/firs');
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/firs/${id}`);
    return res.data;
  },
  create: async (complaintId) => {
    const res = await api.post('/firs', { complaintId });
    return res.data;
  },
  updateStatus: async (id, status) => {
    const res = await api.patch(`/firs/${id}/status`, { status });
    return res.data;
  }
};
