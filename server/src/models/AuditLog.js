import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    userRole: {
      type: String,
      required: true
    },
    action: {
      type: String, // e.g. 'VIEW_SUSPECT', 'ACCESS_DOSSIER', 'UPDATE_FIR', 'UPDATE_SUSPECT'
      required: true
    },
    resourceType: {
      type: String, // 'Suspect', 'FIR', 'Complaint', 'Officer', 'Dossier'
      required: true
    },
    resourceId: {
      type: String,
      default: ''
    },
    policeStationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PoliceStation',
      default: null
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    isCitizenVisible: {
      type: Boolean,
      default: false
    },
    citizenSummary: {
      type: String,
      default: ''
    },
    ipAddress: {
      type: String,
      default: ''
    },
    details: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ policeStationId: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
