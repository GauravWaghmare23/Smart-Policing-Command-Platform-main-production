import { env } from '../config/env.js';

export const generatePatrolPlanAI = async (station, hotspots, availableOfficers, radiusKm = 3) => {
  // Extract compact hotspot info
  const compactHotspots = hotspots.map(h => ({
    name: h.name,
    latitude: h.latitude,
    longitude: h.longitude,
    incidentCount: h.incidentCount,
    activeIncidents: h.activeIncidentCount || h.incidentCount,
    severity: h.severity,
    crimeTypes: h.crimeTypes
  }));

  // Extract compact officer info
  const compactOfficers = availableOfficers.map(o => ({
    id: o._id.toString(),
    name: o.userId?.name || 'Officer',
    badgeNumber: o.badgeNumber,
    rank: o.rank,
    role: o.role,
    currentLocation: o.currentLocation || station.location
  }));

  const stationContext = {
    id: station._id.toString(),
    name: station.name,
    latitude: station.location.latitude,
    longitude: station.location.longitude,
    radiusKm
  };

  if (!env.aiApiKey) {
    console.log('AI_API_KEY not configured. Running deterministic station-specific patrol plan fallback.');
    return getDeterministicPatrolFallback(stationContext, compactHotspots, compactOfficers);
  }
  
  try {
    const prompt = `
      You are an elite Police Intelligence AI Command Planner for Smart Police Stations.
      
      Station Context:
      ${JSON.stringify(stationContext)}
      
      Spatial Crime Hotspots in Station Jurisdiction (${radiusKm} km radius):
      ${JSON.stringify(compactHotspots)}
      
      Available Duty Officers at Station:
      ${JSON.stringify(compactOfficers)}
      
      Task:
      1. Select the top priorityAreas (names of hotspots within this station's jurisdiction) in an optimal, logical patrol order starting from or near ${station.name} (${station.location.latitude}, ${station.location.longitude}).
      2. Assign available officers from this station (using their 'id' values) to this patrol route.
      3. Write a high-level tactical intelligence reasoning statement (2-3 sentences) specifically explaining why this route and officer pairing was chosen for ${station.name}.
      
      Return ONLY a JSON object formatted strictly as follows (no markdown backticks or extra text):
      {
        "priorityAreas": ["Hotspot Name 1", "Hotspot Name 2"],
        "assignedOfficers": ["Officer ID 1", "Officer ID 2"],
        "reason": "Tactical Intelligence Statement for ${station.name}..."
      }
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.aiApiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error ${response.status}`);
    }
    
    const resData = await response.json();
    const textResponse = resData.candidates[0].content.parts[0].text;
    const cleanedText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedText);

    if (!Array.isArray(parsed.priorityAreas) || parsed.priorityAreas.length === 0) {
      throw new Error('AI returned empty priority areas');
    }

    return parsed;
  } catch (error) {
    console.error(`AI Patrol plan generation failed: ${error.message}. Running robust fallback...`);
    return getDeterministicPatrolFallback(stationContext, compactHotspots, compactOfficers);
  }
};

const getDeterministicPatrolFallback = (stationContext, hotspots, availableOfficers) => {
  const sortedHotspots = [...hotspots].sort((a, b) => (b.weightedScore || b.incidentCount) - (a.weightedScore || a.incidentCount));
  const priorityAreas = sortedHotspots.slice(0, 3).map(h => h.name);
  const assignedOfficers = availableOfficers.slice(0, 2).map(o => o.id || o._id || o);
  
  const officerNames = availableOfficers.slice(0, 2).map(o => o.name).join(' & ');
  const reason = priorityAreas.length > 0
    ? `Tactical Intelligence Plan for ${stationContext.name}: Strategic patrol assigned to ${officerNames || 'duty personnel'}. Route prioritizes high-density crime sectors in ${stationContext.name} jurisdiction (${priorityAreas.join(' → ')}) within ${stationContext.radiusKm}km radius.`
    : `Standard routine patrol route assigned to ${stationContext.name} duty personnel for local sector monitoring.`;
    
  return {
    priorityAreas,
    assignedOfficers,
    reason
  };
};
