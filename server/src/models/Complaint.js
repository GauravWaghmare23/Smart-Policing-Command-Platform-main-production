import mongoose from 'mongoose';
import { CRIME_TYPES, COMPLAINT_PRIORITY, COMPLAINT_STATUS } from '../utils/constants.js';

const evidenceSchema = new mongoose.Schema({
  type: {
    type: String, // 'IMAGE', 'VIDEO', 'DOCUMENT'
    required: true
  },
  originalName: String,
  filename: String,
  path: String,
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      unique: true,
      required: true
    },
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Citizen reference is required']
    },
    crimeType: {
      type: String,
      enum: Object.values(CRIME_TYPES),
      required: [true, 'Crime type is required']
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Description is required']
    },
    location: {
      latitude: {
        type: Number,
        required: [true, 'Latitude is required']
      },
      longitude: {
        type: Number,
        required: [true, 'Longitude is required']
      },
      address: {
        type: String,
        required: [true, 'Address is required']
      }
    },
    evidence: [evidenceSchema],
    policeStationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PoliceStation',
      default: null
    },
    assignedOfficerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // References User table
      default: null
    },
    status: {
      type: String,
      enum: Object.values(COMPLAINT_STATUS),
      default: COMPLAINT_STATUS.SUBMITTED
    },
    priority: {
      type: String,
      enum: Object.values(COMPLAINT_PRIORITY),
      default: COMPLAINT_PRIORITY.MEDIUM
    },
    caseUpdates: [
      {
        note: { type: String, required: true },
        updateType: { type: String, enum: ['GENERAL', 'INVESTIGATION', 'EVIDENCE', 'SUSPECT', 'COURT', 'INTERNAL_NOTE'], default: 'GENERAL' },
        isCitizenVisible: { type: Boolean, default: true },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    resolutionDetails: {
      summary: String,
      suspectOutcome: String,
      courtOutcome: String,
      resolvedAt: Date,
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }
  },
  {
    timestamps: true
  }
);

const Complaint = mongoose.model('Complaint', complaintSchema);
export default Complaint;
