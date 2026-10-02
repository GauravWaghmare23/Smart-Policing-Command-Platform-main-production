import api from './axios';

export const notificationApi = {
  getAll: async () => {
    const res = await api.get('/notifications');
    return res.data;
  },
  markAllRead: async () => {
    const res = await api.patch('/notifications/read-all');
    return res.data;
  },
  markRead: async (id) => {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  }
};
