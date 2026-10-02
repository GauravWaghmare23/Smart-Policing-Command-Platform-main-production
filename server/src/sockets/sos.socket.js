import { sendRealtimeEvent } from './socket.js';

export const emitNewSOS = (sos) => {
  const payload = {
    message: `EMERGENCY SOS: Citizen needs immediate assistance!`,
    sos
  };
  sendRealtimeEvent('control-room', 'sos:new', payload);
  if (sos.nearestStationId) {
    sendRealtimeEvent(`station:${sos.nearestStationId}`, 'sos:new', payload);
  }
};

export const emitSOSUpdate = (sos) => {
  const payload = {
    message: `SOS status updated to ${sos.status}`,
    sos
  };
  sendRealtimeEvent('control-room', 'sos:updated', payload);
  if (sos.nearestStationId) {
    sendRealtimeEvent(`station:${sos.nearestStationId}`, 'sos:updated', payload);
  }
  if (sos.citizenId) {
    sendRealtimeEvent(`citizen:${sos.citizenId}`, 'sos:updated', payload);
  }
};
