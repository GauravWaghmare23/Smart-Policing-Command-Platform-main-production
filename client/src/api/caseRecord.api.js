import api from './axios';

export const suspectApi = {
  getAll: async (params = {}) => {
    const res = await api.get('/suspects', { params });
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/suspects/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/suspects', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.patch(`/suspects/${id}`, data);
    return res.data;
  }
};

export const caseDossierApi = {
  search: async (params = {}) => {
    const res = await api.get('/cases/search', { params });
    return res.data;
  },
  getDossier: async (id) => {
    const res = await api.get(`/cases/dossier/${id}`);
    return res.data;
  }
};

export const aiAssistantApi = {
  getCaseBrief: async (data) => {
    const res = await api.post('/ai/case-brief', data);
    return res.data;
  }
};

export const auditLogApi = {
  getLogs: async (params = {}) => {
    const res = await api.get('/audit-logs', { params });
    return res.data;
  }
};
