import api from './axios';

export const reportApi = {
  getDailyReports: async () => {
    const res = await api.get('/reports/daily');
    return res.data;
  },
  getDailyReportById: async (id) => {
    const res = await api.get(`/reports/daily/${id}`);
    return res.data;
  },
  generateDailyReport: async (date) => {
    const res = await api.post('/reports/daily/generate', { date });
    return res.data;
  }
};
