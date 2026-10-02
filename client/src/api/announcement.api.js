import api from './axios';

export const announcementApi = {
  getAll: async (params = {}) => {
    const res = await api.get('/announcements', { params });
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/announcements/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/announcements', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.patch(`/announcements/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/announcements/${id}`);
    return res.data;
  }
};
