import apiClient from './apiClient';

export const getMyNotifications = async () => {
  const res = await apiClient.get('/notifications');
  const data = res.data;
  return data?.data?.notifications || data?.notifications || (Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
};

export const markNotificationAsRead = async (id) => {
  if (!id) return null;
  const res = await apiClient.patch(`/notifications/${id}/read`);
  const data = res.data;
  return data?.data?.notification || data?.notification || data;
};
