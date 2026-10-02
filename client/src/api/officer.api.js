import api from './axios';

export const officerApi = {
  getAll: async (params = {}) => {
    const res = await api.get('/officers', { params });
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/officers/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/officers', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.patch(`/officers/${id}`, data);
    return res.data;
  },
  transfer: async (id, stationId) => {
    const res = await api.patch(`/officers/${id}/transfer`, { stationId });
    return res.data;
  },
  updateStatus: async (userId, dutyStatus) => {
    const res = await api.patch(`/officers/${userId}/status`, { dutyStatus });
    return res.data;
  },
  updateLocation: async (userId, latitude, longitude) => {
    const res = await api.patch(`/officers/${userId}/location`, { latitude, longitude });
    return res.data;
  },
  getFullProfile: async (id) => {
    const res = await api.get(`/officers/${id}/full-profile`);
    return res.data;
  }
};
