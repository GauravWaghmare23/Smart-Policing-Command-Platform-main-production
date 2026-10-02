import { sendRealtimeEvent } from './socket.js';

export const emitNotification = (recipientId, notification) => {
  sendRealtimeEvent(`citizen:${recipientId}`, 'notification:new', { notification });
  sendRealtimeEvent(`officer:${recipientId}`, 'notification:new', { notification });
};
