import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth.api';
import { LoadingSpinner, ErrorState, StatusBadge, PageHeader, EmptyState } from '../../components/common/CommonUI';
import { User, FileText, FileBadge, Siren, Shield, Phone, Mail, Calendar, FolderOpen, ArrowLeft } from 'lucide-react';

const CitizenProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const targetId = id || currentUser?._id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('complaints');

  useEffect(() => {
    if (!targetId) return;
    const fetchCitizenProfile = async () => {
      try {
        setLoading(true);
        const res = await authApi.getCitizenProfile(targetId);
        if (res.success && res.data?.profile) {
          setData(res.data.profile);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load citizen record');
      } finally {
        setLoading(false);
      }
    };
    fetchCitizenProfile();
  }, [targetId]);

  if (loading) return <LoadingSpinner message="Fetching Citizen Record & Interaction History..." />;
  if (error) return <ErrorState message={error} onRetry={() => navigate(-1)} />;

  const citizen = data?.citizen || {};
  const stats = data?.statistics || {};

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {currentUser?.role !== 'CITIZEN' && (
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm gap-2 text-surface-500 hover:text-surface-900">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      )}

      {/* Citizen Profile Header */}
      <div className="card p-6 bg-white border border-surface-200 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-100 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center font-extrabold text-xl text-white border-2 border-indigo-400 shadow-md">
              {(citizen.name || 'C')[0]}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-surface-900">{citizen.name}</h1>
                <span className="badge badge-blue">CITIZEN</span>
              </div>
              <p className="text-xs text-surface-500 mt-1 flex items-center gap-3">
                <span>Account Status: <b className="text-success-700">{citizen.status || 'ACTIVE'}</b></span>
                <span>Registered: <b className="text-surface-800">{new Date(citizen.createdAt).toLocaleDateString()}</b></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-surface-600">
            <div className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-indigo-600" /> {citizen.email}</div>
            <div className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-indigo-600" /> {citizen.phone}</div>
          </div>
        </div>

        {/* Statistics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
          <div className="p-3 text-center bg-surface-50 rounded-xl border border-surface-200">
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">Filed Complaints</span>
            <span className="text-xl font-extrabold text-primary-600 font-mono mt-0.5 block">{stats.totalComplaints}</span>
          </div>
          <div className="p-3 text-center bg-surface-50 rounded-xl border border-surface-200">
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">Registered FIRs</span>
            <span className="text-xl font-extrabold text-blue-600 font-mono mt-0.5 block">{stats.totalFIRs}</span>
          </div>
          <div className="p-3 text-center bg-surface-50 rounded-xl border border-surface-200">
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">SOS Dispatches</span>
            <span className="text-xl font-extrabold text-danger-600 font-mono mt-0.5 block">{stats.totalSOS}</span>
          </div>
          <div className="p-3 text-center bg-surface-50 rounded-xl border border-surface-200">
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">Submitted Evidence</span>
            <span className="text-xl font-extrabold text-purple-600 font-mono mt-0.5 block">{stats.totalEvidence}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-200 pb-2">
        {[
          { key: 'complaints', label: `Filed Complaints (${data?.complaints?.length || 0})` },
          { key: 'firs', label: `Registered FIRs (${data?.firs?.length || 0})` },
          { key: 'sos', label: `SOS Distress Beacons (${data?.sosHistory?.length || 0})` },
          { key: 'evidence', label: `Evidence Gallery (${data?.submittedEvidence?.length || 0})` }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
              activeTab === t.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-surface-600 hover:bg-surface-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="card p-5 bg-white border border-surface-200">
        {activeTab === 'complaints' && (
          <div className="space-y-3">
            {(!data?.complaints || data.complaints.length === 0) ? (
              <p className="text-xs text-surface-400 italic py-6 text-center">No complaints filed by this citizen.</p>
            ) : (
              data.complaints.map(c => (
                <div key={c._id} className="p-3.5 bg-surface-50 border border-surface-100 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary-600">{c.complaintId}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="font-bold text-surface-900 mt-1">{c.title}</p>
                    <p className="text-surface-500 text-[11px] mt-0.5">Assigned Officer: <b>{c.assignedOfficerId?.name || 'Pending'}</b> · Station: <b>{c.policeStationId?.name || 'Central'}</b></p>
                  </div>
                  {currentUser?.role !== 'CITIZEN' && (
                    <button onClick={() => navigate(`/admin/cases/dossier/${c._id}`)} className="btn btn-primary btn-sm text-[11px] gap-1">
                      <FolderOpen className="h-3 w-3" /> Dossier
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'firs' && (
          <div className="space-y-3">
            {(!data?.firs || data.firs.length === 0) ? (
              <p className="text-xs text-surface-400 italic py-6 text-center">No FIRs registered for this citizen.</p>
            ) : (
              data.firs.map(f => (
                <div key={f._id} className="p-3.5 bg-surface-50 border border-surface-100 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-primary-600">{f.firNumber}</span>
                    <p className="font-bold text-surface-900 mt-0.5">{f.crimeType}: {f.description}</p>
                    <p className="text-surface-500 text-[11px] mt-0.5">Investigating Officer: <b>{f.investigatingOfficerId?.name || 'Unassigned'}</b></p>
                  </div>
                  <StatusBadge status={f.status} />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'sos' && (
          <div className="space-y-3">
            {(!data?.sosHistory || data.sosHistory.length === 0) ? (
              <p className="text-xs text-surface-400 italic py-6 text-center">No emergency SOS beacons triggered.</p>
            ) : (
              data.sosHistory.map(s => (
                <div key={s._id} className="p-3.5 bg-surface-50 border border-surface-100 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-danger-600">{s.sosId}</span>
                    <p className="text-surface-700 font-medium">{s.location?.address}</p>
                    <p className="text-surface-400 text-[10px]">{new Date(s.createdAt).toLocaleString()}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(!data?.submittedEvidence || data.submittedEvidence.length === 0) ? (
              <p className="text-xs text-surface-400 italic py-6 text-center col-span-2">No evidence files submitted.</p>
            ) : (
              data.submittedEvidence.map((e, idx) => (
                <div key={idx} className="p-3 bg-surface-50 border border-surface-100 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-surface-900">{e.originalName}</p>
                    <p className="text-[10px] text-surface-500 font-mono">Complaint: #{e.complaintId}</p>
                  </div>
                  <a href={e.path} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm text-[10px]">View File</a>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CitizenProfilePage;
