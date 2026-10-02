import React, { useState, useEffect } from 'react';
import { patrolApi } from '../../api/patrol.api';
import { LoadingSpinner, ErrorState, StatusBadge, PageHeader, EmptyState } from '../../components/common/CommonUI';
import PoliceMap from '../../components/maps/PoliceMap';
import { Route, Navigation, Sparkles } from 'lucide-react';

const Patrols = () => {
  const [patrols, setPatrols]           = useState([]);
  const [activePatrol, setActivePatrol] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  const fetchPatrols = async () => {
    try {
      const res = await patrolApi.getAll();
      if (res.success && res.data?.patrols) {
        setPatrols(res.data.patrols);
        if (res.data.patrols.length > 0) {
          setActivePatrol(res.data.patrols[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch patrols:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load patrol routes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatrols();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await patrolApi.updateStatus(id, status);
      if (res.success) fetchPatrols();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update patrol status');
    }
  };

  if (loading) return <LoadingSpinner message="Fetching Patrol Roster & Route Plans..." />;
  if (error)   return <ErrorState message={error} onRetry={fetchPatrols} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Assigned Field Patrol Deployments"
        subtitle="Interactive GIS road-following patrol route for field officers"
        icon={Route}
      />

      {/* Real Google Maps Road Route Viewer */}
      <div className="card p-0 overflow-hidden">
        <PoliceMap
          routeWaypoints={activePatrol?.route?.waypoints || null}
          height="h-[400px]"
          title={activePatrol ? `Patrol Route Map: ${activePatrol.patrolId}` : 'Patrol Map Telemetry'}
        />
      </div>

      {/* Selected Patrol Detail Banner */}
      {activePatrol && (
        <div className="card bg-primary-50/50 border-primary-200 p-4 space-y-3 text-xs">
          <div className="flex justify-between items-center border-b border-primary-200/60 pb-2">
            <h3 className="font-bold text-surface-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" /> Active Assignment: <span className="font-mono text-primary-700">{activePatrol.patrolId}</span>
            </h3>
            <div className="flex gap-4 font-mono text-surface-600">
              <span>Distance: <b className="text-surface-900">{activePatrol.route?.distance || 0} km</b></span>
              <span>Est. Duration: <b className="text-surface-900">{activePatrol.route?.duration || 0} mins</b></span>
            </div>
          </div>
          {activePatrol.reason && (
            <p className="text-surface-700 italic bg-white p-2.5 rounded-xl border border-surface-200">
              "{activePatrol.reason}"
            </p>
          )}
        </div>
      )}

      {/* Patrol Roster List */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-surface-100">
          <Navigation className="h-4 w-4 text-primary-500" />
          <h2 className="text-sm font-semibold text-surface-800">Active Patrol Roster</h2>
        </div>

        {patrols.length === 0 ? (
          <EmptyState
            icon={Route}
            message="No patrol deployments currently assigned"
            description="Patrol assignments will appear here once dispatched."
          />
        ) : (
          patrols.map((p) => (
            <div
              key={p._id}
              onClick={() => setActivePatrol(p)}
              className={`p-4 rounded-2xl border text-xs cursor-pointer transition-all ${
                activePatrol?._id === p._id
                  ? 'bg-primary-50/30 border-primary-500 shadow-card'
                  : 'bg-white border-surface-200 hover:border-surface-300'
              }`}
            >
              <div className="flex justify-between items-center border-b border-surface-100 pb-2 mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-primary-600">{p.patrolId}</span>
                  <StatusBadge status={p.status} />
                  {p.aiGenerated && (
                    <span className="badge badge-purple text-[10px] gap-1">
                      <Sparkles className="h-3 w-3" /> AI GENERATED
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
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
                </div>
              </div>

              <div>
                <p className="text-surface-400 font-mono text-[10px] uppercase mb-1.5 font-semibold">Waypoints & Stops</p>
                <div className="flex flex-wrap gap-2">
                  {p.route?.waypoints?.map((wp, idx) => (
                    <span key={idx} className="bg-surface-50 border border-surface-200 px-2.5 py-1 rounded-lg text-surface-700 font-mono">
                      {idx + 1}. {wp.name || `${wp.latitude}, ${wp.longitude}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Patrols;
