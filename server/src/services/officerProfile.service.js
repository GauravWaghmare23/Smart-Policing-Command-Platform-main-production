import PoliceOfficer from '../models/PoliceOfficer.js';
import Complaint from '../models/Complaint.js';
import FIR from '../models/FIR.js';
import SOS from '../models/SOS.js';
import Patrol from '../models/Patrol.js';
import ApiError from '../utils/ApiError.js';

export const getFullOfficerProfile = async (officerIdOrUserId) => {
  let officer = await PoliceOfficer.findById(officerIdOrUserId)
    .populate('userId', 'name email phone status avatar createdAt')
    .populate('stationId', 'name stationCode address location phone');

  if (!officer) {
    officer = await PoliceOfficer.findOne({ userId: officerIdOrUserId })
      .populate('userId', 'name email phone status avatar createdAt')
      .populate('stationId', 'name stationCode address location phone');
  }

  if (!officer) {
    throw new ApiError(404, 'Police officer profile not found');
  }

  const userId = officer.userId._id;

  // Gather active & solved complaints
  const complaintsHandled = await Complaint.find({ assignedOfficerId: userId }).sort({ createdAt: -1 });
  const activeComplaints = complaintsHandled.filter(c => c.status !== 'RESOLVED' && c.status !== 'REJECTED');
  const solvedComplaints = complaintsHandled.filter(c => c.status === 'RESOLVED');

  // Gather FIRs investigated
  const firsInvestigated = await FIR.find({ investigatingOfficerId: userId })
    .populate('complaintId', 'complaintId title')
    .sort({ createdAt: -1 });
  const openFIRs = firsInvestigated.filter(f => f.status !== 'CLOSED' && f.status !== 'CHARGESHEET_FILED');
  const closedFIRs = firsInvestigated.filter(f => f.status === 'CLOSED' || f.status === 'CHARGESHEET_FILED');

  // Gather SOS Emergency Responses
  const sosResponses = await SOS.find({ assignedOfficerId: userId }).sort({ createdAt: -1 });
  const resolvedSOS = sosResponses.filter(s => s.status === 'RESOLVED');

  // Gather Patrol Assignments
  const patrolAssignments = await Patrol.find({ assignedOfficerIds: userId }).sort({ createdAt: -1 });

  // Calculate Response & Performance Statistics
  const totalTasks = complaintsHandled.length + firsInvestigated.length + sosResponses.length;
  const totalResolved = solvedComplaints.length + closedFIRs.length + resolvedSOS.length;
  const resolutionRate = totalTasks > 0 ? Number(((totalResolved / totalTasks) * 100).toFixed(1)) : 100;

  // AI-Generated Performance / Activity Summary
  const aiPerformanceSummary = `Officer ${officer.userId.name} (${officer.rank}) holds a ${resolutionRate}% case resolution rate across ${totalTasks} total operational assignments. Demonstrates rapid emergency dispatch response (${sosResponses.length} SOS alerts handled) and active caseload management at ${officer.stationId?.name || 'Jurisdictional Headquarters'}.`;

  return {
    officer,
    statistics: {
      totalTasks,
      totalResolved,
      resolutionRate,
      activeComplaintsCount: activeComplaints.length,
      solvedComplaintsCount: solvedComplaints.length,
      openFIRsCount: openFIRs.length,
      closedFIRsCount: closedFIRs.length,
      sosResponsesCount: sosResponses.length,
      patrolCount: patrolAssignments.length
    },
    activeComplaints,
    solvedComplaints,
    firsInvestigated,
    sosResponses,
    patrolAssignments,
    aiPerformanceSummary
  };
};
