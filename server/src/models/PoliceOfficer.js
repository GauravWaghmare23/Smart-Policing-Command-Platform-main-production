import mongoose from 'mongoose';
import { OFFICER_RANKS, ROLES, DUTY_STATUS } from '../utils/constants.js';

const policeOfficerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID reference is required'],
      unique: true
    },
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PoliceStation',
      default: null
    },
    badgeNumber: {
      type: String,
      required: [true, 'Badge number is required'],
      unique: true,
      trim: true
    },
    rank: {
      type: String,
      enum: Object.values(OFFICER_RANKS),
      required: [true, 'Officer rank is required']
    },
    role: {
      type: String,
      enum: [ROLES.STATION_HEAD, ROLES.INVESTIGATING_OFFICER, ROLES.FIELD_OFFICER],
      required: [true, 'Officer application role is required']
    },
    dutyStatus: {
      type: String,
      enum: Object.values(DUTY_STATUS),
      default: DUTY_STATUS.AVAILABLE
    },
    currentLocation: {
      latitude: {
        type: Number,
        default: null
      },
      longitude: {
        type: Number,
        default: null
      },
      isSimulated: {
        type: Boolean,
        default: false
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
    lastLocationUpdate: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Sync locationGeo with currentLocation
policeOfficerSchema.pre('save', function (next) {
  if (this.currentLocation && this.currentLocation.latitude != null && this.currentLocation.longitude != null) {
    this.locationGeo = {
      type: 'Point',
      coordinates: [this.currentLocation.longitude, this.currentLocation.latitude]
    };
  } else {
    this.locationGeo = undefined;
  }
  next();
});

policeOfficerSchema.index({ locationGeo: '2dsphere' });
policeOfficerSchema.index({ stationId: 1, dutyStatus: 1 });

const PoliceOfficer = mongoose.model('PoliceOfficer', policeOfficerSchema);
export default PoliceOfficer;
