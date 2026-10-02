import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { firApi } from '../../api/fir.api';
import { aiAssistantApi } from '../../api/caseRecord.api';
import { LoadingSpinner, ErrorState, StatusBadge, PageHeader, EmptyState } from '../../components/common/CommonUI';
import OfficerProfileModal from '../../components/officer/OfficerProfileModal';
import { FileBadge, Search, Filter, ChevronRight, Cpu, FolderOpen, UserCheck, Scale, Sparkles, X, Shield } from 'lucide-react';

const STATUSES = ['REGISTERED', 'UNDER_INVESTIGATION', 'CHARGESHEET_FILED', 'CLOSED'];

const FIRs = () => {
  const [firs, setFirs]                 = useState([]);
  const [filteredFirs, setFilteredFirs] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery]   = useState('');

  // AI Briefing State
  const [aiBriefModal, setAiBriefModal] = useState(null); // FIR record for briefing
  const [briefingData, setBriefingData] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  // Officer Profile Modal State
  const [selectedOfficerId, setSelectedOfficerId] = useState(null);

  const navigate = useNavigate();

  const fetchFIRs = async () => {
    try {
      const res = await firApi.getAll();
      if (res.success && res.data?.firs) {
        setFirs(res.data.firs);
        setFilteredFirs(res.data.firs);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'FIR register unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFIRs();
  }, []);

  useEffect(() => {
    let result = [...firs];
    if (statusFilter) {
      result = result.filter((f) => f.status === statusFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.firNumber?.toLowerCase().includes(q) ||
          f.crimeType?.toLowerCase().includes(q) ||
          f.citizenId?.name?.toLowerCase().includes(q)
      );
    }
    setFilteredFirs(result);
  }, [statusFilter, searchQuery, firs]);

  const handleOpenAiBrief = async (fir) => {
    setAiBriefModal(fir);
    setBriefingLoading(true);
    try {
      const res = await aiAssistantApi.getCaseBrief({
        crimeType: fir.crimeType,
        description: fir.description,
        firId: fir._id
      });
      if (res.success && res.data?.briefing) {
        setBriefingData(res.data.briefing);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate AI legal briefing');
    } finally {
      setBriefingLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Fetching First Information Reports (FIR) Register..." />;
  if (error)   return <ErrorState message={error} onRetry={fetchFIRs} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="First Information Reports (FIR)"
        subtitle="Official statutory crime records registered under Bharatiya Nagarik Suraksha Sanhita (BNSS)"
        icon={FileBadge}
      />

      {/* Filter Control Bar */}
      <div className="card p-4 bg-white border border-surface-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search FIR Number, Crime Type, Citizen..."
              className="input pl-10 text-xs"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select text-xs"
            >
              <option value="">All FIR Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* FIRs Table */}
      <div className="card overflow-hidden bg-white border border-surface-200">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th>FIR Number</th>
                <th>Crime Type</th>
                <th>Complainant</th>
                <th>Station</th>
                <th>Investigating Officer</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {filteredFirs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12">
                    <EmptyState
                      icon={FileBadge}
                      message="No FIRs match the criteria"
                      description="Search query or filters returned zero registered FIR records."
                    />
                  </td>
                </tr>
              ) : (
                filteredFirs.map((fir) => (
                  <tr key={fir._id} className="hover:bg-surface-50">
                    <td>
                      <span className="font-mono font-bold text-xs text-primary-600">{fir.firNumber}</span>
                    </td>
                    <td className="text-xs font-semibold text-surface-900">{fir.crimeType}</td>
                    <td className="text-xs">{fir.citizenId?.name || 'Anonymous'}</td>
                    <td className="text-xs text-surface-600">{fir.policeStationId?.name || 'Central'}</td>
                    <td>
                      <button
                        onClick={() => setSelectedOfficerId(fir.investigatingOfficerId?._id || fir.investigatingOfficerId)}
                        className="text-xs font-semibold text-primary-700 hover:underline flex items-center gap-1"
                      >
                        <Shield className="h-3 w-3 text-primary-600" />
                        {fir.investigatingOfficerId?.name || 'Unassigned'}
                      </button>
                    </td>
                    <td><StatusBadge status={fir.status} /></td>
                    <td className="text-right flex items-center justify-end gap-1.5 py-3">
                      <button
                        onClick={() => handleOpenAiBrief(fir)}
                        className="btn btn-sm bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 text-[11px] gap-1"
                        title="AI Statutory & Investigation Briefing"
                      >
                        <Sparkles className="h-3 w-3 text-indigo-600" /> AI Brief
                      </button>
                      <button
                        onClick={() => navigate(`/admin/cases/dossier/${fir._id}`)}
                        className="btn btn-primary btn-sm text-[11px] gap-1"
                      >
                        <FolderOpen className="h-3 w-3" /> Case Dossier
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Briefing Modal */}
      {aiBriefModal && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-surface-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-surface-900">AI Statutory Legal & Investigation Brief</h2>
                  <p className="text-xs text-surface-400 font-mono">FIR: {aiBriefModal.firNumber} ({aiBriefModal.crimeType})</p>
                </div>
              </div>
              <button onClick={() => setAiBriefModal(null)} className="text-surface-400 hover:text-surface-600"><X className="h-5 w-5" /></button>
            </div>

            {briefingLoading ? (
              <div className="py-12"><LoadingSpinner message="Analyzing case facts against Bharatiya Nyaya Sanhita (BNS 2023) statutory framework..." /></div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Statutory Sections */}
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest block">Recommended Statutory Provisions to Review</span>
                  <div className="space-y-2">
                    {briefingData?.recommendedSections?.map((s, i) => (
                      <div key={i} className="p-2 bg-white rounded-lg border border-indigo-200 flex justify-between items-center">
                        <div>
                          <p className="font-mono font-bold text-indigo-900">{s.act} {s.section}</p>
                          <p className="text-surface-700">{s.title}</p>
                        </div>
                        <span className="badge badge-amber">{s.severity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Evidence Checklist */}
                <div className="p-4 bg-surface-50 border border-surface-200 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-surface-600 uppercase tracking-widest block">Mandatory Evidence Checklist</span>
                  <ul className="list-disc list-inside space-y-1 text-surface-700">
                    {briefingData?.evidenceChecklist?.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Missing Info Flags */}
                {briefingData?.missingInfoList?.length > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block">Missing Fact Flags</span>
                    {briefingData.missingInfoList.map((m, i) => (
                      <p key={i} className="text-amber-900">• {m}</p>
                    ))}
                  </div>
                )}

                {/* Advisory Disclaimer */}
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[11px] font-medium leading-relaxed">
                  ⚠️ {briefingData?.disclaimer}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Officer Profile Modal */}
      {selectedOfficerId && (
        <OfficerProfileModal officerId={selectedOfficerId} onClose={() => setSelectedOfficerId(null)} />
      )}
    </div>
  );
};

export default FIRs;
