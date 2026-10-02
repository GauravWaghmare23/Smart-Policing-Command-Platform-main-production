import React, { useState, useEffect } from 'react';
import { officerApi } from '../../api/officer.api';
import { StatusBadge, LoadingSpinner, ErrorState } from '../../components/common/CommonUI';
import { User, Shield, Phone, Mail, Award, CheckCircle2, Clock, FileText, Siren, Route, Cpu, X, Building2 } from 'lucide-react';

const OfficerProfileModal = ({ officerId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!officerId) return;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await officerApi.getFullProfile(officerId);
        if (res.success && res.data?.profile) {
          setData(res.data.profile);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load officer dossier');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [officerId]);

  if (!officerId) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-panel max-w-4xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-surface-900 text-white flex items-center justify-between border-b border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center font-bold text-lg text-white border-2 border-primary-400 shadow-md">
              {(data?.officer?.userId?.name || 'P')[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{data?.officer?.userId?.name || 'Loading Officer...'}</h2>
                {data?.officer?.dutyStatus && <StatusBadge status={data.officer.dutyStatus} />}
              </div>
              <p className="text-xs text-surface-400 font-mono mt-0.5">
                {data?.officer?.rank} · Badge #{data?.officer?.badgeNumber} · {data?.officer?.role?.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 rounded-xl transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12"><LoadingSpinner message="Compiling Police Officer Service Record & AI Analytics..." /></div>
        ) : error ? (
          <div className="p-8"><ErrorState message={error} /></div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-surface-50">
            {/* AI Performance Summary Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-primary-900 via-primary-800 to-indigo-900 text-white shadow-card">
              <div className="flex items-center gap-2 text-xs font-bold text-primary-300 uppercase tracking-widest mb-1">
                <Cpu className="h-4 w-4" /> AI Performance & Activity Summary
              </div>
              <p className="text-xs text-primary-100 leading-relaxed font-sans">{data?.aiPerformanceSummary}</p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="card p-3.5 text-center bg-white border border-surface-200 shadow-sm">
                <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">Resolution Rate</span>
                <span className="text-xl font-extrabold text-success-600 font-mono mt-0.5 block">{data?.statistics?.resolutionRate}%</span>
              </div>
              <div className="card p-3.5 text-center bg-white border border-surface-200 shadow-sm">
                <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">Active Cases</span>
                <span className="text-xl font-extrabold text-primary-600 font-mono mt-0.5 block">{data?.statistics?.activeComplaintsCount + data?.statistics?.openFIRsCount}</span>
              </div>
              <div className="card p-3.5 text-center bg-white border border-surface-200 shadow-sm">
                <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">SOS Dispatches</span>
                <span className="text-xl font-extrabold text-danger-600 font-mono mt-0.5 block">{data?.statistics?.sosResponsesCount}</span>
              </div>
              <div className="card p-3.5 text-center bg-white border border-surface-200 shadow-sm">
                <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">Patrol Log</span>
                <span className="text-xl font-extrabold text-amber-600 font-mono mt-0.5 block">{data?.statistics?.patrolCount}</span>
              </div>
            </div>

            {/* Officer Details Info */}
            <div className="card p-5 bg-white space-y-3 border border-surface-200">
              <h3 className="text-xs font-bold text-surface-700 uppercase tracking-wider border-b border-surface-100 pb-2">Jurisdiction & Contact Info</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="flex items-center gap-2 text-surface-700">
                  <Building2 className="h-4 w-4 text-primary-600" />
                  <span>Station: <b>{data?.officer?.stationId?.name || 'Unassigned'}</b></span>
                </div>
                <div className="flex items-center gap-2 text-surface-700">
                  <Mail className="h-4 w-4 text-primary-600" />
                  <span>Email: <b>{data?.officer?.userId?.email || '—'}</b></span>
                </div>
                <div className="flex items-center gap-2 text-surface-700">
                  <Phone className="h-4 w-4 text-primary-600" />
                  <span>Phone: <b>{data?.officer?.userId?.phone || '—'}</b></span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-surface-200 pb-2">
              {[
                { key: 'overview', label: `FIRs Investigated (${data?.firsInvestigated?.length || 0})` },
                { key: 'complaints', label: `Complaints (${data?.activeComplaints?.length + data?.solvedComplaints?.length || 0})` },
                { key: 'sos', label: `SOS Emergencies (${data?.sosResponses?.length || 0})` }
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

            {/* Tab Contents */}
            {activeTab === 'overview' && (
              <div className="space-y-2">
                {data?.firsInvestigated?.length === 0 ? (
                  <p className="text-xs text-surface-400 italic py-6 text-center">No FIRs investigated by this officer.</p>
                ) : (
                  data?.firsInvestigated?.map(f => (
                    <div key={f._id} className="p-3 bg-white rounded-xl border border-surface-200 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary-600">{f.firNumber}</span>
                          <StatusBadge status={f.status} />
                        </div>
                        <p className="text-surface-700 mt-1 font-semibold">{f.crimeType}: {f.description}</p>
                      </div>
                      <span className="text-[11px] text-surface-400 font-mono">{new Date(f.createdAt).toLocaleDateString()}</span>
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
                    <div key={c._id} className="p-3 bg-white rounded-xl border border-surface-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-surface-900">{c.complaintId}</span>
                        <p className="text-surface-700 font-semibold">{c.title}</p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'sos' && (
              <div className="space-y-2">
                {data?.sosResponses?.length === 0 ? (
                  <p className="text-xs text-surface-400 italic py-6 text-center">No SOS emergency response records.</p>
                ) : (
                  data?.sosResponses?.map(s => (
                    <div key={s._id} className="p-3 bg-white rounded-xl border border-surface-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-danger-600">{s.sosId}</span>
                        <p className="text-surface-600">{s.location?.address}</p>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficerProfileModal;
