import api from './axios';

export const crimeApi = {
  getHotspots: async () => {
    const res = await api.get('/crime/hotspots');
    return res.data;
  },
  getStatistics: async () => {
    const res = await api.get('/crime/statistics');
    return res.data;
  }
};
