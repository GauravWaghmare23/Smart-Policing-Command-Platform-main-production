import mongoose from 'mongoose';
import { CRIME_TYPES, FIR_STATUS } from '../utils/constants.js';

const timelineEventSchema = new mongoose.Schema({
  stage: { type: String, required: true }, // e.g., 'FIR Registered', 'Evidence Collected', 'Suspect Interrogated', 'Chargesheet Filed', 'Court Outcome'
  description: { type: String, required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now }
});

const firSchema = new mongoose.Schema(
  {
    firNumber: {
      type: String,
      unique: true,
      required: true
    },
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: [true, 'Complaint reference is required']
    },
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Citizen reference is required']
    },
    policeStationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PoliceStation',
      required: [true, 'Police Station reference is required']
    },
    investigatingOfficerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Investigating officer reference is required']
    },
    crimeType: {
      type: String,
      enum: Object.values(CRIME_TYPES),
      required: [true, 'Crime type is required']
    },
    description: {
      type: String,
      required: [true, 'Description is required']
    },
    suspectIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Suspect'
      }
    ],
    legalSections: [
      {
        act: { type: String, default: 'BNS' }, // Bharatiya Nyaya Sanhita / IPC
        section: String,
        title: String
      }
    ],
    evidenceList: [
      {
        title: String,
        type: { type: String }, // 'PHYSICAL', 'DIGITAL', 'FORENSIC', 'TESTIMONY'
        description: String,
        filename: String,
        path: String,
        collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        collectedAt: { type: Date, default: Date.now }
      }
    ],
    investigationTimeline: [timelineEventSchema],
    courtOutcome: {
      courtName: String,
      judge: String,
      caseNumber: String,
      status: { type: String, enum: ['PENDING_TRIAL', 'IN_HEARING', 'CONVICTED', 'ACQUITTED', 'DISCHARGED', 'NOT_SUBMITTED'], default: 'NOT_SUBMITTED' },
      verdictDate: Date,
      notes: String
    },
    resolutionDetails: {
      summary: String,
      suspectOutcome: String,
      courtOutcome: String,
      resolvedAt: Date,
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    status: {
      type: String,
      enum: Object.values(FIR_STATUS),
      default: FIR_STATUS.REGISTERED
    },
    registeredAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const FIR = mongoose.model('FIR', firSchema);
export default FIR;
