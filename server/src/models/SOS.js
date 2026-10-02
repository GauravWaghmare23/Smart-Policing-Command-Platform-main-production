import mongoose from 'mongoose';
import { SOS_STATUS } from '../utils/constants.js';

const sosSchema = new mongoose.Schema(
  {
    sosId: {
      type: String,
      unique: true,
      required: true
    },
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null // Can be null if triggered anonymously or guest
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
        default: 'Location description unavailable'
      }
    },
    locationGeo: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: undefined
      }
    },
    nearestStationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PoliceStation',
      default: null
    },
    assignedOfficerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    dispatchedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    dispatchNote: {
      type: String,
      default: ''
    },
    isStationHeadPersonalResponse: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: Object.values(SOS_STATUS),
      default: SOS_STATUS.ACTIVE
    },
    escalationReason: {
      type: String,
      default: ''
    },
    rejectedBy: [
      {
        officerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        reason: {
          type: String,
          default: ''
        },
        rejectedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    dispatchHistory: [
      {
        officerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        dispatchedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        dispatchedAt: {
          type: Date,
          default: Date.now
        },
        status: {
          type: String,
          default: 'DISPATCHED'
        },
        note: {
          type: String,
          default: ''
        }
      }
    ],
    officerDistanceKm: {
      type: Number,
      default: null
    },
    stationDistanceKm: {
      type: Number,
      default: null
    },
    ackTimeoutAt: {
      type: Date,
      default: null
    },
    acknowledgedAt: {
      type: Date,
      default: null
    },
    dispatchedAt: {
      type: Date,
      default: null
    },
    enRouteAt: {
      type: Date,
      default: null
    },
    arrivedAt: {
      type: Date,
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    resolutionSummary: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Sync locationGeo with location coordinates
sosSchema.pre('save', function (next) {
  if (this.location && this.location.latitude != null && this.location.longitude != null) {
    this.locationGeo = {
      type: 'Point',
      coordinates: [this.location.longitude, this.location.latitude]
    };
  }
  next();
});

sosSchema.index({ locationGeo: '2dsphere' });
sosSchema.index({ status: 1 });
sosSchema.index({ nearestStationId: 1 });
sosSchema.index({ assignedOfficerId: 1 });

const SOS = mongoose.model('SOS', sosSchema);
export default SOS;
