import Notification from '../models/Notification.js';
import { sendRealtimeEvent } from '../sockets/socket.js';
import ApiError from '../utils/ApiError.js';

export const createNotificationRecord = async (notificationData) => {
  const notification = await Notification.create(notificationData);
  
  // Realtime emit to specific user room
  sendRealtimeEvent(`citizen:${notification.recipientId}`, 'notification:new', {
    notification
  });
  sendRealtimeEvent(`officer:${notification.recipientId}`, 'notification:new', {
    notification
  });
  
  return notification;
};

export const getNotificationsForUser = async (userId) => {
  return await Notification.find({ recipientId: userId }).sort({ createdAt: -1 });
};

export const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    recipientId: userId
  });
  
  if (!notification) {
    throw new ApiError(404, 'Notification not found or access denied');
  }
  
  notification.isRead = true;
  await notification.save();
  return notification;
};

export const markAllNotificationsAsRead = async (userId) => {
  await Notification.updateMany(
    { recipientId: userId, isRead: false },
    { $set: { isRead: true } }
  );
  return { success: true, message: 'All notifications marked as read' };
};
