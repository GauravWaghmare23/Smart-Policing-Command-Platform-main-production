import api from './axios';

export const dashboardApi = {
  getAdminDashboard: async () => {
    const res = await api.get('/dashboard/admin');
    return res.data;
  },
  getStationDashboard: async () => {
    const res = await api.get('/dashboard/station');
    return res.data;
  },
  getOfficerDashboard: async () => {
    const res = await api.get('/dashboard/officer');
    return res.data;
  },
  getCitizenDashboard: async () => {
    const res = await api.get('/dashboard/citizen');
    return res.data;
  }
};
