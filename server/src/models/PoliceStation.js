import mongoose from 'mongoose';
import { STATION_STATUS } from '../utils/constants.js';

const policeStationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Station name is required'],
      trim: true
    },
    stationCode: {
      type: String,
      required: [true, 'Station code is required'],
      unique: true,
      trim: true
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required']
    },
    email: {
      type: String,
      trim: true,
      default: ''
    },
    location: {
      latitude: {
        type: Number,
        required: [true, 'Latitude is required']
      },
      longitude: {
        type: Number,
        required: [true, 'Longitude is required']
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
    stationHeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    jurisdictionRadiusKm: {
      type: Number,
      default: 5
    },
    status: {
      type: String,
      enum: Object.values(STATION_STATUS),
      default: STATION_STATUS.ACTIVE
    }
  },
  {
    timestamps: true
  }
);

// Sync locationGeo with location coordinates
policeStationSchema.pre('save', function (next) {
  if (this.location && this.location.latitude != null && this.location.longitude != null) {
    this.locationGeo = {
      type: 'Point',
      coordinates: [this.location.longitude, this.location.latitude]
    };
  }
  next();
});

policeStationSchema.index({ locationGeo: '2dsphere' });
policeStationSchema.index({ status: 1 });

const PoliceStation = mongoose.model('PoliceStation', policeStationSchema);
export default PoliceStation;
