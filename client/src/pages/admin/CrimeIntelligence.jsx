import React, { useState, useEffect } from 'react';
import { crimeApi } from '../../api/crime.api';
import { LoadingSpinner, ErrorState, StatusBadge, PageHeader, StatCard, SectionCard } from '../../components/common/CommonUI';
import PoliceMap from '../../components/maps/PoliceMap';
import { Flame, BarChart2, PieChart, Sparkles, AlertTriangle, Shield, MapPin } from 'lucide-react';

const CrimeIntelligence = () => {
  const [hotspots, setHotspots]               = useState([]);
  const [stats, setStats]                     = useState(null);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState('');

  const fetchIntelligenceData = async () => {
    try {
      const [hotspotRes, statsRes] = await Promise.all([
        crimeApi.getHotspots(),
        crimeApi.getStatistics()
      ]);

      if (hotspotRes.success && hotspotRes.data?.hotspots) {
        setHotspots(hotspotRes.data.hotspots);
        if (hotspotRes.data.hotspots.length > 0) {
          setSelectedHotspot(hotspotRes.data.hotspots[0]);
        }
      }
      if (statsRes.success && statsRes.data?.statistics) {
        setStats(statsRes.data.statistics);
      }
    } catch (err) {
      console.error('Failed to fetch crime intelligence:', err);
      setError(err.response?.data?.message || err.message || 'Crime intelligence data unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligenceData();
  }, []);

  const handleMapMarkerClick = (type, data) => {
    if (type === 'hotspot') {
      setSelectedHotspot(data);
    }
  };

  if (loading) return <LoadingSpinner message="Calculating spatial crime clusters & intelligence analytics..." />;
  if (error)   return <ErrorState message={error} onRetry={fetchIntelligenceData} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Crime Intelligence & Hotspot Overlay"
        subtitle="Dynamic GIS incident density overlays with AI-backed risk profiling"
        icon={Flame}
      />

      {/* Map Overlay */}
      <div className="card p-0 overflow-hidden">
        <PoliceMap
          hotspots={hotspots}
          height="h-[420px]"
          title="Spatial Crime Density Overlay"
          onMarkerClick={handleMapMarkerClick}
        />
      </div>

      {/* AI Assessment Panel for Selected Hotspot */}
      {selectedHotspot && (
        <div className="card bg-warning-50/50 border-warning-200 p-5 space-y-2">
          <div className="flex items-center justify-between border-b border-warning-200/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-warning-100 rounded-lg">
                <Sparkles className="h-4 w-4 text-warning-700" />
              </div>
              <h3 className="text-sm font-bold text-surface-900">
                Hotspot Intelligence Dossier: <span className="text-primary-700 font-mono">{selectedHotspot.name}</span>
              </h3>
            </div>
            <StatusBadge status={selectedHotspot.severity} />
          </div>
          <p className="text-xs text-surface-700 leading-relaxed pt-1">
            Recorded <b className="text-warning-800 font-semibold">{selectedHotspot.incidentCount} incidents</b> concentrated around coordinates ({selectedHotspot.latitude}, {selectedHotspot.longitude}).
            Primary crime vectors: <span className="font-mono text-primary-700 font-medium">{Array.isArray(selectedHotspot.crimeTypes) ? selectedHotspot.crimeTypes.join(', ') : 'N/A'}</span>.
          </p>
        </div>
      )}

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hotspots Cluster Table */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <div className="flex items-center gap-2.5">
              <Flame className="h-4 w-4 text-warning-600" />
              <h2 className="text-sm font-semibold text-surface-800">Spatial Incident Density Clusters</h2>
            </div>
            <span className="badge badge-amber">{hotspots.length} Clusters</span>
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th>Cluster Area</th>
                  <th>GPS Coordinates</th>
                  <th>Incidents</th>
                  <th>Severity</th>
                  <th>Predominant Crimes</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {hotspots.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-surface-400">
                      No crime hotspots detected.
                    </td>
                  </tr>
                ) : (
                  hotspots.map((hs, idx) => (
                    <tr
                      key={idx}
                      onClick={() => setSelectedHotspot(hs)}
                      className={`cursor-pointer transition-colors ${
                        selectedHotspot?.name === hs.name ? 'bg-primary-50/80 font-semibold' : ''
                      }`}
                    >
                      <td className="font-medium text-surface-900">{hs.name}</td>
                      <td className="font-mono text-xs text-surface-500">
                        {hs.latitude}, {hs.longitude}
                      </td>
                      <td className="font-mono font-bold text-primary-600">{hs.incidentCount}</td>
                      <td><StatusBadge status={hs.severity} /></td>
                      <td className="text-xs text-surface-500">
                        {Array.isArray(hs.crimeTypes) ? hs.crimeTypes.join(', ') : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Crime Type & Status Breakdown Cards */}
        <div className="space-y-6">
          <SectionCard title="Crime Type Breakdown" icon={BarChart2}>
            <div className="space-y-2">
              {stats?.crimeBreakdown && Object.entries(stats.crimeBreakdown).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-surface-50 border border-surface-100">
                  <span className="font-medium text-surface-700">{type.replace(/_/g, ' ')}</span>
                  <span className="font-bold text-primary-600 font-mono">{count}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Case Status Breakdown" icon={PieChart}>
            <div className="space-y-2">
              {stats?.statusBreakdown && Object.entries(stats.statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-surface-50 border border-surface-100">
                  <StatusBadge status={status} />
                  <span className="font-bold text-surface-900 font-mono">{count}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default CrimeIntelligence;
