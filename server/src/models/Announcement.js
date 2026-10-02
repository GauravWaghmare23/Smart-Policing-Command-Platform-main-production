import mongoose from 'mongoose';
import { ANNOUNCEMENT_TYPES, ANNOUNCEMENT_SEVERITY, ANNOUNCEMENT_STATUS } from '../utils/constants.js';

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Message is required']
    },
    type: {
      type: String,
      enum: Object.values(ANNOUNCEMENT_TYPES),
      default: ANNOUNCEMENT_TYPES.GENERAL
    },
    severity: {
      type: String,
      enum: Object.values(ANNOUNCEMENT_SEVERITY),
      default: ANNOUNCEMENT_SEVERITY.LOW
    },
    targetArea: {
      name: {
        type: String,
        required: [true, 'Target area name is required']
      },
      latitude: {
        type: Number,
        default: null
      },
      longitude: {
        type: Number,
        default: null
      },
      radius: {
        type: Number,
        default: null // in meters or km
      }
    },
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PoliceStation',
      default: null // null if control room alert
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    expiresAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: Object.values(ANNOUNCEMENT_STATUS),
      default: ANNOUNCEMENT_STATUS.ACTIVE
    }
  },
  {
    timestamps: true
  }
);

const Announcement = mongoose.model('Announcement', announcementSchema);
export default Announcement;
