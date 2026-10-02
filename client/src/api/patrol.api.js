import api from './axios';

export const patrolApi = {
  getAll: async () => {
    const res = await api.get('/patrols');
    return res.data;
  },
  generate: async (stationId) => {
    const res = await api.post('/patrols/generate', { stationId });
    return res.data;
  },
  updateStatus: async (id, status) => {
    const res = await api.patch(`/patrols/${id}/status`, { status });
    return res.data;
  },
  getRouteDirections: async (origin, waypoints) => {
    const res = await api.post('/patrols/route', { origin, waypoints });
    return res.data;
  }
};
