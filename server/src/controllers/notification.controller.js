import * as notificationService from '../services/notification.service.js';
import { ApiResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationService.getNotificationsForUser(req.user._id);
  return ApiResponse(res, 200, 'Notifications retrieved successfully', { notifications });
});

export const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user._id);
  return ApiResponse(res, 200, 'Notification marked as read successfully', { notification });
});

export const markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllNotificationsAsRead(req.user._id);
  return ApiResponse(res, 200, 'All notifications marked as read successfully', result);
});
