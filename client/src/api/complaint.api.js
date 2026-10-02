import api from './axios';

export const complaintApi = {
  getAll: async () => {
    const res = await api.get('/complaints');
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/complaints/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/complaints', data);
    return res.data;
  },
  updateStatus: async (id, status) => {
    const res = await api.patch(`/complaints/${id}/status`, { status });
    return res.data;
  },
  assignOfficer: async (id, officerUserId) => {
    const res = await api.patch(`/complaints/${id}/assign`, { officerUserId });
    return res.data;
  },
  uploadEvidence: async (id, formData) => {
    const res = await api.post(`/complaints/${id}/evidence`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },
  addUpdate: async (id, data) => {
    const res = await api.post(`/complaints/${id}/updates`, data);
    return res.data;
  },
  resolveCase: async (id, data) => {
    const res = await api.post(`/complaints/${id}/resolve`, data);
    return res.data;
  }
};
