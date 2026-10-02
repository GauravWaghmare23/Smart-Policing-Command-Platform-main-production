import Complaint from '../models/Complaint.js';
import { calculateDistance } from '../utils/distance.js';

export const calculateHotspots = async (stationLocation = null, radiusKm = null) => {
  const complaints = await Complaint.find({});
  
  // Active/unresolved statuses get full weight (1.0)
  // Resolved/rejected statuses get historical lower weight (0.2)
  const ACTIVE_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'INVESTIGATION', 'FIR_REGISTERED'];

  const clusters = {};
  
  complaints.forEach((comp) => {
    if (!comp.location || comp.location.latitude === undefined || comp.location.longitude === undefined) {
      return;
    }

    const compLat = Number(comp.location.latitude);
    const compLng = Number(comp.location.longitude);

    // If station coordinates and radius supplied, filter by distance
    if (stationLocation && radiusKm) {
      const dist = calculateDistance(
        stationLocation.latitude,
        stationLocation.longitude,
        compLat,
        compLng
      );
      if (dist > radiusKm) {
        return;
      }
    }

    const latBin = Number(compLat.toFixed(2));
    const lngBin = Number(compLng.toFixed(2));
    const binKey = `${latBin},${lngBin}`;
    
    if (!clusters[binKey]) {
      clusters[binKey] = {
        name: comp.location.address ? comp.location.address.split(',')[0].trim() : `Sector (${latBin}, ${lngBin})`,
        latitude: latBin,
        longitude: lngBin,
        incidentCount: 0,
        activeIncidentCount: 0,
        weightedScore: 0,
        crimeTypes: new Set(),
        severity: 'LOW'
      };
    }
    
    clusters[binKey].incidentCount += 1;
    const isActive = ACTIVE_STATUSES.includes(comp.status);
    if (isActive) {
      clusters[binKey].activeIncidentCount += 1;
      clusters[binKey].weightedScore += 1.0;
    } else {
      clusters[binKey].weightedScore += 0.2;
    }

    if (comp.crimeType) {
      clusters[binKey].crimeTypes.add(comp.crimeType);
    }
  });
  
  const hotspotList = Object.values(clusters).map((cluster) => {
    // Determine severity based on weightedScore (prioritizes active cases)
    if (cluster.weightedScore >= 4 || cluster.activeIncidentCount >= 4) {
      cluster.severity = 'CRITICAL';
    } else if (cluster.weightedScore >= 2.5 || cluster.activeIncidentCount >= 2) {
      cluster.severity = 'HIGH';
    } else if (cluster.weightedScore >= 1.2 || cluster.activeIncidentCount >= 1) {
      cluster.severity = 'MEDIUM';
    } else {
      cluster.severity = 'LOW';
    }
    
    cluster.crimeTypes = Array.from(cluster.crimeTypes);
    return cluster;
  });
  
  // Sort by weightedScore descending
  return hotspotList.sort((a, b) => b.weightedScore - a.weightedScore);
};

export const getCrimeStatistics = async () => {
  const totalCount = await Complaint.countDocuments({});
  
  const typeBreakdown = await Complaint.aggregate([
    { $group: { _id: '$crimeType', count: { $sum: 1 } } }
  ]);
  
  const statusBreakdown = await Complaint.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  const formattedTypes = {};
  typeBreakdown.forEach((item) => {
    formattedTypes[item._id] = item.count;
  });
  
  const formattedStatuses = {};
  statusBreakdown.forEach((item) => {
    formattedStatuses[item._id] = item.count;
  });
  
  return {
    totalComplaints: totalCount,
    crimeBreakdown: formattedTypes,
    statusBreakdown: formattedStatuses
  };
};
