import api from './axios';

export const stationApi = {
  getAll: async () => {
    const res = await api.get('/stations');
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/stations/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/stations', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.patch(`/stations/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/stations/${id}`);
    return res.data;
  },
  changeStatus: async (id, status) => {
    const res = await api.patch(`/stations/${id}/status`, { status });
    return res.data;
  },
  assignHead: async (id, officerUserId) => {
    const res = await api.patch(`/stations/${id}/assign`, { officerUserId });
    return res.data;
  }
};
