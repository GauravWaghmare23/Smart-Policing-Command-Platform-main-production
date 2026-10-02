import api from './axios';

export const sosApi = {
  getAll: async () => {
    const res = await api.get('/sos');
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/sos/${id}`);
    return res.data;
  },
  trigger: async (latitude, longitude, address) => {
    const res = await api.post('/sos', { latitude, longitude, address });
    return res.data;
  },
  acknowledge: async (id) => {
    const res = await api.patch(`/sos/${id}/acknowledge`);
    return res.data;
  },
  reject: async (id, reason) => {
    const res = await api.patch(`/sos/${id}/reject`, { reason });
    return res.data;
  },
  dispatch: async (id, payload) => {
    const body = typeof payload === 'string'
      ? { officerUserId: payload }
      : (payload || {});
    const res = await api.patch(`/sos/${id}/dispatch`, body);
    return res.data;
  },
  markEnRoute: async (id) => {
    const res = await api.patch(`/sos/${id}/en-route`);
    return res.data;
  },
  markArrived: async (id) => {
    const res = await api.patch(`/sos/${id}/arrived`);
    return res.data;
  },
  resolve: async (id, summary) => {
    const res = await api.patch(`/sos/${id}/resolve`, { summary });
    return res.data;
  },
  escalate: async (id, reason) => {
    const res = await api.patch(`/sos/${id}/escalate`, { reason });
    return res.data;
  }
};
