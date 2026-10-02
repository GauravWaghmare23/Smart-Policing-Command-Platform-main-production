import mongoose from 'mongoose';

const dailyReportSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true
    },
    totalComplaints: {
      type: Number,
      default: 0
    },
    crimeBreakdown: {
      type: Map,
      of: Number,
      default: {}
    },
    activeSOS: {
      type: Number,
      default: 0
    },
    resolvedCases: {
      type: Number,
      default: 0
    },
    highRiskAreas: [
      {
        type: String
      }
    ],
    summary: {
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

const DailyReport = mongoose.model('DailyReport', dailyReportSchema);
export default DailyReport;
