import AuditLog from '../models/AuditLog.js';

export const logAudit = async ({
  userId,
  userName,
  userRole,
  action,
  resourceType,
  resourceId = '',
  policeStationId = null,
  previousValue = null,
  newValue = null,
  isCitizenVisible = false,
  citizenSummary = '',
  ipAddress = '',
  details = ''
}) => {
  try {
    await AuditLog.create({
      userId,
      userName: userName || 'System User',
      userRole: userRole || 'SYSTEM',
      action,
      resourceType,
      resourceId: String(resourceId),
      policeStationId,
      previousValue,
      newValue,
      isCitizenVisible: Boolean(isCitizenVisible),
      citizenSummary: citizenSummary || details,
      ipAddress,
      details
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
};
