import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permission and set up Android channel.
 * Call once at app startup (e.g. in _layout.jsx).
 */
export const requestNotificationPermission = async () => {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('sos-alerts', {
        name: 'SOS Emergency Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 300, 500, 300, 500],
        lightColor: '#FF0000',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('complaint-updates', {
        name: 'Complaint Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('announcements', {
        name: 'Public Safety Announcements',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 300, 200, 300],
        lightColor: '#D97706',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('general', {
        name: 'General Notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('[PUSH] Permission request failed:', err.message);
    return false;
  }
};

/**
 * Show an immediate local push notification.
 * @param {string} title
 * @param {string} body
 * @param {object} data  - arbitrary extra payload
 * @param {'sos-alerts'|'complaint-updates'|'announcements'|'general'} channel
 */
export const showLocalNotification = async (title, body, data = {}, channel = 'general') => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId: channel }),
      },
      trigger: null, // fire immediately
    });
  } catch (err) {
    console.warn('[PUSH] Failed to show notification:', err.message);
  }
};

/** Convenience helpers */
export const notifySOSAcknowledged = () =>
  showLocalNotification(
    '🚨 SOS Acknowledged',
    'Police control room has acknowledged your emergency. Help is on the way.',
    { type: 'sos', status: 'ACKNOWLEDGED' },
    'sos-alerts'
  );

export const notifySOSDispatched = (officerName) =>
  showLocalNotification(
    '🚔 Officer Dispatched',
    officerName
      ? `Officer ${officerName} is on the way to your location.`
      : 'A police officer has been dispatched to your location.',
    { type: 'sos', status: 'DISPATCHED' },
    'sos-alerts'
  );

export const notifySOSResolved = () =>
  showLocalNotification(
    '✅ SOS Resolved',
    'Your emergency SOS has been resolved. Stay safe.',
    { type: 'sos', status: 'RESOLVED' },
    'sos-alerts'
  );

export const notifyComplaintSubmitted = (complaintId) =>
  showLocalNotification(
    '📋 Complaint Submitted',
    `Your complaint (ID: #${String(complaintId).slice(-8)}) has been successfully submitted.`,
    { type: 'complaint', complaintId },
    'complaint-updates'
  );

export const notifyComplaintUpdate = (title, message) =>
  showLocalNotification(title, message, { type: 'complaint' }, 'complaint-updates');

export const notifyAnnouncement = (announcementTitle, message) =>
  showLocalNotification(
    `📢 ${announcementTitle}`,
    message,
    { type: 'announcement' },
    'announcements'
  );
