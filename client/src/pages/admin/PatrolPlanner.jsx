import React, { useState, useEffect } from 'react';
import { patrolApi } from '../../api/patrol.api';
import { stationApi } from '../../api/station.api';
import { crimeApi } from '../../api/crime.api';
import { complaintApi } from '../../api/complaint.api';
import { officerApi } from '../../api/officer.api';
import { LoadingSpinner, ErrorState, StatusBadge, PageHeader, StatCard } from '../../components/common/CommonUI';
import PoliceMap from '../../components/maps/PoliceMap';
import { Route, Sparkles, Navigation, Clock, CheckCircle2, AlertCircle, Building2, Shield, Users, MapPin, Flame } from 'lucide-react';

const PatrolPlanner = () => {
  const [patrols, setPatrols]                   = useState([]);
  const [stations, setStations]                 = useState([]);
  const [selectedStationId, setSelectedStationId] = useState('');
  const [selectedStation, setSelectedStation]   = useState(null);
  const [stationHotspots, setStationHotspots]   = useState([]);
  const [stationComplaints, setStationComplaints] = useState([]);
  const [stationOfficers, setStationOfficers]   = useState([]);
  const [activePatrol, setActivePatrol]         = useState(null);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState('');
  const [generating, setGenerating]             = useState(false);

  const fetchData = async () => {
    try {
      const [patRes, stRes] = await Promise.all([
        patrolApi.getAll(),
        stationApi.getAll()
      ]);

      if (patRes.success && patRes.data?.patrols) {
        setPatrols(patRes.data.patrols);
        if (patRes.data.patrols.length > 0) {
          setActivePatrol(patRes.data.patrols[0]);
        }
      }
      if (stRes.success && stRes.data?.stations) {
        setStations(stRes.data.stations);
        if (stRes.data.stations.length > 0) {
          const firstStId = stRes.data.stations[0]._id;
          setSelectedStationId(firstStId);
          setSelectedStation(stRes.data.stations[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch patrol planner data:', err);
      setError(err.response?.data?.message || err.message || 'Patrol planner data unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch station-specific metrics whenever selected station changes
  useEffect(() => {
    if (!selectedStationId) return;
    const st = stations.find(s => s._id === selectedStationId);
    setSelectedStation(st || null);

    const fetchStationMetrics = async () => {
      try {
        const [hotRes, compRes, offRes] = await Promise.all([
          crimeApi.getHotspots(),
          complaintApi.getAll({ stationId: selectedStationId }),
          officerApi.getAll({ stationId: selectedStationId })
        ]);

        if (hotRes.success && hotRes.data?.hotspots) {
          setStationHotspots(hotRes.data.hotspots);
        }
        if (compRes.success && compRes.data?.complaints) {
          setStationComplaints(compRes.data.complaints);
        }
        if (offRes.success && offRes.data?.officers) {
          setStationOfficers(offRes.data.officers);
        }
      } catch (err) {
        console.error('Failed to fetch station specific metrics:', err);
      }
    };

    fetchStationMetrics();
  }, [selectedStationId, stations]);

  const handleGeneratePatrol = async () => {
    if (!selectedStationId) {
      alert('Please select a target police station');
      return;
    }
    setGenerating(true);
    try {
      const res = await patrolApi.generate(selectedStationId);
      if (res.success && res.data?.patrol) {
        setActivePatrol(res.data.patrol);
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate patrol plan');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await patrolApi.updateStatus(id, status);
      if (res.success) fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update patrol status');
    }
  };

  if (loading) return <LoadingSpinner message="Loading Tactical AI Patrol Planner..." />;
  if (error)   return <ErrorState message={error} onRetry={fetchData} />;

  const activeIncidents = stationComplaints.filter(c => c.status !== 'RESOLVED' && c.status !== 'REJECTED');
  const availableOfficers = stationOfficers.filter(o => o.dutyStatus === 'AVAILABLE' || o.dutyStatus === 'ON_DUTY');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Route className="h-6 w-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-surface-900">Jurisdictional AI Patrol Planner</h1>
          </div>
          <p className="text-sm text-surface-500">Calculates station-specific, road-following patrol routes via Google Maps & Gemini AI</p>
        </div>

        {/* Generate Patrol Command Box */}
        <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-surface-200 shadow-card">
          <div>
            <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-widest block px-1 mb-0.5">Select Police Station</span>
            <select
              value={selectedStationId}
              onChange={(e) => setSelectedStationId(e.target.value)}
              className="select text-xs py-1.5 font-semibold text-surface-900"
            >
              {stations.map((st) => (
                <option key={st._id} value={st._id}>
                  {st.name} ({st.stationCode})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGeneratePatrol}
            disabled={generating || !selectedStationId}
            className="btn btn-primary text-xs gap-2 whitespace-nowrap self-end py-2"
          >
            <Sparkles className="h-4 w-4" /> {generating ? 'Planning Route...' : 'Generate AI Patrol Plan'}
          </button>
        </div>
      </div>

      {/* Station Jurisdiction Metrics Banner */}
      {selectedStation && (
        <div className="card p-5 bg-primary-50/40 border-primary-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-primary-200/60 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-surface-900">{selectedStation.name}</h3>
                <span className="text-xs font-mono text-primary-700 font-semibold">Station Code: {selectedStation.stationCode}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-blue">Operational Radius: 3.0 km</span>
              <StatusBadge status={selectedStation.status} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-white p-3 rounded-xl border border-surface-200">
              <span className="text-[10px] font-semibold text-surface-400 uppercase">Station Hotspots</span>
              <p className="text-xl font-bold text-orange-600 font-mono mt-0.5">{stationHotspots.length}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-surface-200">
              <span className="text-[10px] font-semibold text-surface-400 uppercase">Active Incidents</span>
              <p className="text-xl font-bold text-danger-600 font-mono mt-0.5">{activeIncidents.length}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-surface-200">
              <span className="text-[10px] font-semibold text-surface-400 uppercase">Available Officers</span>
              <p className="text-xl font-bold text-success-600 font-mono mt-0.5">{availableOfficers.length}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-surface-200">
              <span className="text-[10px] font-semibold text-surface-400 uppercase">Total Personnel</span>
              <p className="text-xl font-bold text-primary-600 font-mono mt-0.5">{stationOfficers.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Map Route Overview */}
      <div className="card p-0 overflow-hidden">
        <PoliceMap
          routeWaypoints={activePatrol?.route?.waypoints || null}
          stations={selectedStation ? [selectedStation] : []}
          hotspots={stationHotspots}
          height="h-[400px]"
          title={activePatrol ? `Patrol Route Map: ${activePatrol.patrolId}` : 'Select Patrol Plan to View Route'}
        />
      </div>

      {/* Selected Patrol Info Box */}
      {activePatrol && (
        <div className="card bg-white border-surface-200 p-5 space-y-4 shadow-card">
          <div className="flex flex-wrap justify-between items-center border-b border-surface-100 pb-3 gap-2">
            <h3 className="text-sm font-bold text-surface-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" /> AI Patrol Plan Summary: <span className="font-mono text-primary-700">{activePatrol.patrolId}</span>
            </h3>
            <div className="flex gap-4 text-xs font-mono text-surface-600">
              <span>Distance: <b className="text-surface-900">{activePatrol.route?.distance || 0} km</b></span>
              <span>Est. Duration: <b className="text-surface-900">{activePatrol.route?.duration || 0} mins</b></span>
            </div>
          </div>

          {activePatrol.reason && (
            <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 space-y-1">
              <span className="text-[10px] font-bold uppercase text-surface-400 tracking-wider">AI Tactical Reasoning</span>
              <p className="text-xs text-surface-700 leading-relaxed font-medium">"{activePatrol.reason}"</p>
            </div>
          )}

          {/* Waypoint Sequence Display */}
          <div>
            <h4 className="text-xs font-bold text-surface-700 uppercase tracking-wider mb-2 font-mono">Patrol Waypoints Sequence</h4>
            <div className="flex flex-wrap gap-2">
              {activePatrol.route?.waypoints?.map((wp, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-primary-50 border border-primary-200 px-3 py-1.5 rounded-xl text-xs">
                  <span className="h-5 w-5 rounded-full bg-primary-600 text-white flex items-center justify-center text-[10px] font-bold font-mono">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-primary-900">{wp.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Patrol Plans List */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <div className="flex items-center gap-2.5">
            <Navigation className="h-4 w-4 text-primary-500" />
            <h2 className="text-sm font-semibold text-surface-800">Active & Planned Station Deployments</h2>
          </div>
          <span className="badge badge-blue">{patrols.length} Patrols</span>
        </div>

        <div className="p-5 space-y-4">
          {patrols.length === 0 ? (
            <div className="py-12 text-center text-sm text-surface-400">
              No patrol routes currently planned. Select a police station and click "Generate AI Patrol Plan" above.
            </div>
          ) : (
            patrols.map((p) => (
              <div
                key={p._id}
                onClick={() => setActivePatrol(p)}
                className={`p-5 rounded-2xl border text-xs cursor-pointer transition-all ${
                  activePatrol?._id === p._id
                    ? 'bg-primary-50/30 border-primary-500 shadow-card'
                    : 'bg-white border-surface-200 hover:border-surface-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-100 pb-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-primary-600">{p.patrolId}</span>
                      <StatusBadge status={p.status} />
                      {p.aiGenerated && (
                        <span className="badge badge-purple text-[10px] gap-1">
                          <Sparkles className="h-3 w-3" /> AI GENERATED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-surface-500 mt-1">Station: <b className="text-surface-800">{p.stationId?.name}</b></p>
                  </div>

                  <div className="flex items-center gap-2">
                    {p.status === 'PLANNED' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(p._id, 'ACTIVE'); }}
                        className="btn btn-primary btn-sm"
                      >
                        Start Patrol
                      </button>
                    )}
                    {p.status === 'ACTIVE' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(p._id, 'COMPLETED'); }}
                        className="btn btn-sm bg-success-50 text-success-700 border border-success-200 hover:bg-success-100"
                      >
                        Complete Patrol
                      </button>
                    )}
                    {p.status !== 'COMPLETED' && p.status !== 'CANCELLED' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(p._id, 'CANCELLED'); }}
                        className="btn btn-ghost btn-sm text-surface-500"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Waypoints & Officers Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-3">
                  <div>
                    <h4 className="font-semibold text-surface-400 uppercase text-[10px] mb-2 font-mono">Assigned Officers</h4>
                    <div className="flex flex-wrap gap-2">
                      {p.officerIds && p.officerIds.length > 0 ? (
                        p.officerIds.map((off) => (
                          <span key={off._id} className="bg-surface-100 text-surface-800 px-2.5 py-1 rounded-lg text-xs font-medium">
                            {off.name} ({off.badgeNumber || 'Officer'})
                          </span>
                        ))
                      ) : (
                        <span className="text-surface-400 italic">No officers assigned</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-surface-400 uppercase text-[10px] mb-2 font-mono">
                      Route Stops ({p.route?.waypoints?.length || 0} stops • {p.route?.distance || 0} km)
                    </h4>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {p.route?.waypoints?.map((wp, idx) => (
                        <span key={idx} className="bg-primary-50 border border-primary-100 text-primary-700 px-2 py-0.5 rounded-lg text-[11px] font-mono">
                          {idx + 1}. {wp.name || `${wp.latitude}, ${wp.longitude}`}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PatrolPlanner;
