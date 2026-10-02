import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { officerApi } from '../../api/officer.api';
import { LoadingSpinner, ErrorState, StatusBadge } from '../../components/common/CommonUI';
import PoliceMap from '../../components/maps/PoliceMap';
import { Shield, Phone, Mail, Award, CheckCircle2, FileText, Siren, Route, Cpu, Building2, MapPin } from 'lucide-react';

const OfficerProfilePage = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const targetId = id || currentUser?._id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('firs');

  useEffect(() => {
    if (!targetId) return;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await officerApi.getFullProfile(targetId);
        if (res.success && res.data?.profile) {
          setData(res.data.profile);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to compile officer personnel dossier');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [targetId]);

  if (loading) return <LoadingSpinner message="Compiling Police Officer Service Record & AI Telemetry..." />;
  if (error) return <ErrorState message={error} />;

  const officer = data?.officer;
  const user = officer?.userId || {};
  const stats = data?.statistics || {};

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Profile Dossier Banner */}
      <div className="card p-6 bg-white border border-surface-200 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-100 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center font-extrabold text-xl text-white border-2 border-primary-400 shadow-md">
              {(user.name || 'O')[0]}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-surface-900">{user.name}</h1>
                <span className="font-mono text-xs font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg">
                  {officer?.badgeNumber}
                </span>
                {officer?.dutyStatus && <StatusBadge status={officer.dutyStatus} />}
              </div>
              <p className="text-xs text-surface-500 mt-1">
                <span className="font-bold text-surface-800">{officer?.rank?.replace(/_/g, ' ')}</span> · <span className="font-mono text-primary-600 font-bold">{officer?.role?.replace(/_/g, ' ')}</span> · Station: <b className="text-surface-900">{officer?.stationId?.name || 'Central Jurisdiction'}</b>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-surface-600">
            <div className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-primary-600" /> {user.email}</div>
            <div className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-primary-600" /> {user.phone}</div>
          </div>
        </div>

        {/* AI Activity & Performance Summary */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-primary-900 via-primary-800 to-indigo-900 text-white shadow-card">
          <div className="flex items-center gap-2 text-xs font-bold text-primary-300 uppercase tracking-widest mb-1">
            <Cpu className="h-4 w-4" /> AI Performance & Operational Activity Summary
          </div>
          <p className="text-xs text-primary-100 leading-relaxed font-sans">{data?.aiPerformanceSummary}</p>
        </div>

        {/* Operational Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-5">
          <div className="p-3 text-center bg-surface-50 rounded-xl border border-surface-200">
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">Case Resolution</span>
            <span className="text-xl font-extrabold text-success-600 font-mono mt-0.5 block">{stats.resolutionRate}%</span>
          </div>
          <div className="p-3 text-center bg-surface-50 rounded-xl border border-surface-200">
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">Active Complaints</span>
            <span className="text-xl font-extrabold text-primary-600 font-mono mt-0.5 block">{stats.activeComplaintsCount}</span>
          </div>
          <div className="p-3 text-center bg-surface-50 rounded-xl border border-surface-200">
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">FIRs Investigated</span>
            <span className="text-xl font-extrabold text-blue-600 font-mono mt-0.5 block">{data?.firsInvestigated?.length || 0}</span>
          </div>
          <div className="p-3 text-center bg-surface-50 rounded-xl border border-surface-200">
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">SOS Responses</span>
            <span className="text-xl font-extrabold text-danger-600 font-mono mt-0.5 block">{stats.sosResponsesCount}</span>
          </div>
          <div className="p-3 text-center bg-surface-50 rounded-xl border border-surface-200">
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">Patrol Routes</span>
            <span className="text-xl font-extrabold text-amber-600 font-mono mt-0.5 block">{stats.patrolCount}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Tabs & Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-surface-200 pb-2">
            {[
              { key: 'firs', label: `FIRs Investigated (${data?.firsInvestigated?.length || 0})` },
              { key: 'complaints', label: `Complaints (${data?.activeComplaints?.length + data?.solvedComplaints?.length || 0})` },
              { key: 'sos', label: `SOS Emergencies (${data?.sosResponses?.length || 0})` },
              { key: 'patrols', label: `Patrol Log (${data?.patrolAssignments?.length || 0})` }
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                  activeTab === t.key ? 'bg-primary-600 text-white shadow-sm' : 'text-surface-600 hover:bg-surface-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="card p-4 bg-white border border-surface-200">
            {activeTab === 'firs' && (
              <div className="space-y-2">
                {(!data?.firsInvestigated || data.firsInvestigated.length === 0) ? (
                  <p className="text-xs text-surface-400 italic py-6 text-center">No FIRs investigated by this officer.</p>
                ) : (
                  data.firsInvestigated.map(f => (
                    <div key={f._id} className="p-3 bg-surface-50 rounded-xl border border-surface-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-primary-600">{f.firNumber}</span>
                        <p className="font-semibold text-surface-900 mt-0.5">{f.crimeType}: {f.description}</p>
                      </div>
                      <StatusBadge status={f.status} />
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'complaints' && (
              <div className="space-y-2">
                {[...(data?.activeComplaints || []), ...(data?.solvedComplaints || [])].length === 0 ? (
                  <p className="text-xs text-surface-400 italic py-6 text-center">No assigned complaints.</p>
                ) : (
                  [...(data?.activeComplaints || []), ...(data?.solvedComplaints || [])].map(c => (
                    <div key={c._id} className="p-3 bg-surface-50 rounded-xl border border-surface-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-surface-900">{c.complaintId}</span>
                        <p className="font-semibold text-surface-800">{c.title}</p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'sos' && (
              <div className="space-y-2">
                {(!data?.sosResponses || data.sosResponses.length === 0) ? (
                  <p className="text-xs text-surface-400 italic py-6 text-center">No SOS emergency responses.</p>
                ) : (
                  data.sosResponses.map(s => (
                    <div key={s._id} className="p-3 bg-surface-50 rounded-xl border border-surface-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-danger-600">{s.sosId}</span>
                        <p className="text-surface-700">{s.location?.address}</p>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'patrols' && (
              <div className="space-y-2">
                {(!data?.patrolAssignments || data.patrolAssignments.length === 0) ? (
                  <p className="text-xs text-surface-400 italic py-6 text-center">No patrol route assignments.</p>
                ) : (
                  data.patrolAssignments.map(p => (
                    <div key={p._id} className="p-3 bg-surface-50 rounded-xl border border-surface-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-surface-900">{p.routeName || 'Patrol Route'}</span>
                        <p className="text-[11px] text-surface-500 font-mono">Shift: {p.shift || 'DAY'}</p>
                      </div>
                      <StatusBadge status={p.status || 'SCHEDULED'} />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live GPS Telemetry Map */}
        <div className="card p-4 bg-white border border-surface-200">
          <h2 className="text-xs font-bold text-surface-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary-500" /> Duty Telemetry & GPS Location
          </h2>
          <PoliceMap officers={officer ? [officer] : []} height="h-[360px]" title={`GPS Monitor: ${user.name}`} />
        </div>
      </div>
    </div>
  );
};

export default OfficerProfilePage;
