import mongoose from 'mongoose';
import { PATROL_STATUS } from '../utils/constants.js';

const waypointSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  reachedAt: {
    type: Date,
    default: null
  }
});

const breadcrumbSchema = new mongoose.Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  accuracy: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
});

const patrolSchema = new mongoose.Schema(
  {
    patrolId: {
      type: String,
      unique: true,
      required: true
    },
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PoliceStation',
      required: true
    },
    officerIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],
    route: {
      waypoints: [waypointSchema],
      distance: {
        type: Number, // in km
        default: 0
      },
      duration: {
        type: Number, // in minutes
        default: 0
      },
      encodedPolyline: {
        type: String,
        default: ''
      }
    },
    actualPath: [breadcrumbSchema],
    currentLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      lastUpdate: { type: Date, default: null }
    },
    distanceTravelledKm: {
      type: Number,
      default: 0
    },
    progressPercent: {
      type: Number,
      default: 0
    },
    startTime: {
      type: Date,
      default: null
    },
    endTime: {
      type: Date,
      default: null
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },
    status: {
      type: String,
      enum: Object.values(PATROL_STATUS),
      default: PATROL_STATUS.PLANNED
    },
    aiGenerated: {
      type: Boolean,
      default: false
    },
    reason: {
      type: String,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

patrolSchema.index({ stationId: 1, status: 1 });
patrolSchema.index({ officerIds: 1 });

const Patrol = mongoose.model('Patrol', patrolSchema);
export default Patrol;
