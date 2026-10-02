import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { complaintApi } from '../../api/complaint.api';
import { officerApi } from '../../api/officer.api';
import { firApi } from '../../api/fir.api';
import { suspectApi } from '../../api/caseRecord.api';
import { LoadingSpinner, ErrorState, StatusBadge, PageHeader, SectionCard } from '../../components/common/CommonUI';
import PoliceMap from '../../components/maps/PoliceMap';
import { FileText, User, MapPin, ArrowLeft, Upload, FileBadge, CheckCircle, X, Shield, Clock, Plus, Search, MessageSquare, Lock, Scale, UserCheck, AlertOctagon, CheckCircle2 } from 'lucide-react';

const ComplaintDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [complaint, setComplaint]     = useState(null);
  const [officers, setOfficers]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  // Modals & Forms
  const [assignModalOpen, setAssignModalOpen]             = useState(false);
  const [selectedOfficerUserId, setSelectedOfficerUserId] = useState('');
  const [assigning, setAssigning]                         = useState(false);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus]             = useState('');
  const [updatingStatus, setUpdatingStatus]   = useState(false);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [evidenceFile, setEvidenceFile]       = useState(null);
  const [uploading, setUploading]             = useState(false);

  const [firCreating, setFirCreating]         = useState(false);

  // 1. Case Updates State
  const [updateNote, setUpdateNote] = useState('');
  const [updateType, setUpdateType] = useState('GENERAL');
  const [isCitizenVisible, setIsCitizenVisible] = useState(true);
  const [addingUpdate, setAddingUpdate] = useState(false);

  // 2. Suspect Search & Link Modal State
  const [suspectModalOpen, setSuspectModalOpen] = useState(false);
  const [suspectSearchQuery, setSuspectSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingSuspects, setSearchingSuspects] = useState(false);
  const [caseSuspects, setCaseSuspects] = useState([]);

  // New Suspect Form inside modal
  const [newSuspectForm, setNewSuspectForm] = useState({
    name: '', alias: '', gender: 'MALE', age: '', phone: '', address: '', status: 'SUSPECT'
  });

  // 3. Resolution Details Modal State
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [suspectOutcome, setSuspectOutcome] = useState('');
  const [courtOutcomeNote, setCourtOutcomeNote] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchComplaintData = async () => {
    try {
      const res = await complaintApi.getById(id);
      if (res.success && res.data?.complaint) {
        setComplaint(res.data.complaint);
        setNewStatus(res.data.complaint.status);

        if (res.data.complaint.policeStationId?._id) {
          const offRes = await officerApi.getAll({ stationId: res.data.complaint.policeStationId._id });
          if (offRes.success && offRes.data?.officers) {
            setOfficers(offRes.data.officers);
          }
        }

        // Fetch suspects linked to this complaint or associated FIR
        const suspRes = await suspectApi.getAll({ complaintId: id });
        if (suspRes.success && suspRes.data?.suspects) {
          setCaseSuspects(suspRes.data.suspects);
        }
      }
    } catch (err) {
      console.error('Failed to fetch complaint details:', err);
      setError(err.response?.data?.message || err.message || 'Complaint record unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaintData();
  }, [id]);

  const handleAssignOfficer = async (e) => {
    e.preventDefault();
    if (!selectedOfficerUserId) return;
    setAssigning(true);
    try {
      const res = await complaintApi.assignOfficer(id, selectedOfficerUserId);
      if (res.success) {
        setAssignModalOpen(false);
        fetchComplaintData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign officer');
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!newStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await complaintApi.updateStatus(id, newStatus);
      if (res.success) {
        setStatusModalOpen(false);
        fetchComplaintData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update complaint status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUploadEvidence = async (e) => {
    e.preventDefault();
    if (!evidenceFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('evidence', evidenceFile);

      const res = await complaintApi.uploadEvidence(id, formData);
      if (res.success) {
        setUploadModalOpen(false);
        setEvidenceFile(null);
        fetchComplaintData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload evidence');
    } finally {
      setUploading(false);
    }
  };

  const handleRegisterFIR = async () => {
    if (!window.confirm('Convert this complaint into a formal FIR under Bharatiya Nagarik Suraksha Sanhita (BNSS)?')) return;
    setFirCreating(true);
    try {
      const res = await firApi.create(id);
      if (res.success) {
        alert(`FIR registered successfully! FIR Number: ${res.data.fir.firNumber}`);
        fetchComplaintData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to register FIR');
    } finally {
      setFirCreating(false);
    }
  };

  // Add Case Update Handler
  const handleAddCaseUpdate = async (e) => {
    e.preventDefault();
    if (!updateNote.trim()) return;
    setAddingUpdate(true);
    try {
      const res = await complaintApi.addUpdate(id, {
        note: updateNote.trim(),
        updateType,
        isCitizenVisible
      });
      if (res.success) {
        setUpdateNote('');
        fetchComplaintData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post case update');
    } finally {
      setAddingUpdate(false);
    }
  };

  // Search Suspects Handler
  const handleSearchSuspects = async (e) => {
    e.preventDefault();
    if (!suspectSearchQuery.trim()) return;
    setSearchingSuspects(true);
    try {
      const res = await suspectApi.getAll({ search: suspectSearchQuery.trim() });
      if (res.success && res.data?.suspects) {
        setSearchResults(res.data.suspects);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingSuspects(false);
    }
  };

  // Link Existing Suspect Handler
  const handleLinkSuspect = async (suspectId) => {
    try {
      const res = await suspectApi.update(suspectId, { complaintId: id });
      if (res.success) {
        setSuspectModalOpen(false);
        fetchComplaintData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to link suspect');
    }
  };

  // Create & Link New Suspect Handler
  const handleCreateNewSuspect = async (e) => {
    e.preventDefault();
    try {
      const res = await suspectApi.create({ ...newSuspectForm, complaintId: id });
      if (res.success) {
        setSuspectModalOpen(false);
        setNewSuspectForm({ name: '', alias: '', gender: 'MALE', age: '', phone: '', address: '', status: 'SUSPECT' });
        fetchComplaintData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create suspect record');
    }
  };

  // Final Case Resolution Handler
  const handleExecuteResolution = async (e) => {
    e.preventDefault();
    if (!resolutionSummary.trim()) return;
    setResolving(true);
    try {
      const res = await complaintApi.resolveCase(id, {
        summary: resolutionSummary.trim(),
        suspectOutcome,
        courtOutcome: courtOutcomeNote
      });
      if (res.success) {
        setResolveModalOpen(false);
        fetchComplaintData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resolve case');
    } finally {
      setResolving(false);
    }
  };

  if (loading) return <LoadingSpinner message="Fetching Complete Case File & Suspect Dossier..." />;
  if (error)   return <ErrorState message={error} onRetry={fetchComplaintData} />;
  if (!complaint) return <ErrorState message="Complaint file not found" />;

  const statusTimeline = [
    { key: 'SUBMITTED',      label: 'Submitted' },
    { key: 'UNDER_REVIEW',   label: 'Under Review' },
    { key: 'ASSIGNED',       label: 'Assigned' },
    { key: 'INVESTIGATION',  label: 'Investigation' },
    { key: 'FIR_REGISTERED', label: 'FIR Registered' },
    { key: 'RESOLVED',       label: 'Resolved' }
  ];

  const currentStatusIndex = statusTimeline.findIndex(s => s.key === complaint.status);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <button
        onClick={() => navigate(-1)}
        className="btn btn-ghost btn-sm gap-2 text-surface-500 hover:text-surface-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Workspace
      </button>

      {/* Header Case Dossier Bar */}
      <div className="card p-6 bg-white border border-surface-200 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-100 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-surface-900">{complaint.title}</h1>
              <span className="font-mono text-xs font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg">
                {complaint.complaintId}
              </span>
              <StatusBadge status={complaint.status} />
            </div>
            <p className="text-xs text-surface-500 mt-1 flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-surface-400" /> {complaint.location?.address}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setStatusModalOpen(true)} className="btn btn-secondary btn-sm">
              Update Status
            </button>
            <button onClick={() => setAssignModalOpen(true)} className="btn btn-primary btn-sm">
              Assign Officer
            </button>
            <button onClick={() => setSuspectModalOpen(true)} className="btn btn-sm bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 gap-1.5 font-semibold">
              <UserCheck className="h-3.5 w-3.5" /> Add / Link Suspect
            </button>
            <button onClick={() => setUploadModalOpen(true)} className="btn btn-sm bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Upload Evidence
            </button>
            {complaint.status !== 'FIR_REGISTERED' && (
              <button onClick={handleRegisterFIR} disabled={firCreating} className="btn btn-sm bg-success-50 text-success-700 border border-success-200 hover:bg-success-100 gap-1.5">
                <FileBadge className="h-3.5 w-3.5" /> {firCreating ? 'Filing...' : 'Register FIR'}
              </button>
            )}
            {complaint.status !== 'RESOLVED' && (
              <button onClick={() => setResolveModalOpen(true)} className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5 font-bold shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5" /> Resolve & Close Case
              </button>
            )}
          </div>
        </div>

        {/* Case Progression Timeline */}
        <div className="pt-5">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-widest mb-3">Case Progression Timeline</p>
          <div className="flex items-center justify-between relative overflow-x-auto py-2">
            {statusTimeline.map((step, idx) => {
              const isCompleted = idx <= currentStatusIndex && currentStatusIndex !== -1;
              const isCurrent = idx === currentStatusIndex;
              return (
                <div key={step.key} className="flex flex-col items-center min-w-[100px] z-10">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrent ? 'bg-primary-600 text-white ring-4 ring-primary-100' : isCompleted ? 'bg-success-600 text-white' : 'bg-surface-200 text-surface-400'
                  }`}>
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <span className={`text-[11px] mt-1.5 font-medium ${isCurrent ? 'text-primary-700 font-bold' : isCompleted ? 'text-surface-700' : 'text-surface-400'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Complainant Profile Card & Case Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Complainant Telemetry */}
        <div className="card p-5 bg-white border border-surface-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100">
            <h3 className="text-xs font-bold text-surface-800 uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4 text-primary-600" /> Complainant Profile
            </h3>
            <span className="badge badge-blue">CITIZEN</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm">
                {(complaint.citizenId?.name || 'C')[0]}
              </div>
              <div>
                <p className="font-bold text-surface-900 text-sm">{complaint.citizenId?.name || 'Anonymous Citizen'}</p>
                <p className="text-surface-500 font-mono text-[11px]">{complaint.citizenId?.phone || 'No phone recorded'}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-surface-100 space-y-1.5">
              <p className="text-surface-500">Email: <b className="text-surface-800">{complaint.citizenId?.email || '—'}</b></p>
              <p className="text-surface-500">Account Status: <b className="text-success-700">{complaint.citizenId?.status || 'ACTIVE'}</b></p>
              <p className="text-surface-500">Registered On: <b className="text-surface-800">{new Date(complaint.createdAt).toLocaleDateString()}</b></p>
            </div>
          </div>

          <div className="pt-3 border-t border-surface-100 flex items-center justify-between text-xs text-primary-700 font-semibold">
            <span>Jurisdiction Station:</span>
            <span className="font-bold">{complaint.policeStationId?.name || 'Central'}</span>
          </div>
        </div>

        {/* Center/Right: Suspects & Resolution Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Suspects & Accused Linked Card */}
          <SectionCard title={`Linked Suspects & Accused (${caseSuspects.length})`} icon={UserCheck}>
            {caseSuspects.length === 0 ? (
              <div className="py-4 text-center text-xs text-surface-400">
                No suspects currently linked to this case file. Click <b>"Add / Link Suspect"</b> to search or register.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {caseSuspects.map((s) => {
                  const cleanName = (s.name || '').replace(/^(?:Full\s*Name\s*)?(?:Alias\s*)?(?:Legal\s*Classification\s*)?/gi, '').replace(/^(?:Name|Suspect\s*Name)\s*[:\-]\s*/gi, '').trim() || s.name;
                  const cleanAlias = (s.alias || '').replace(/^(?:Alias|Known\s*As)\s*[:\-]\s*/gi, '').trim();

                  return (
                    <div key={s._id} className="p-3 rounded-xl bg-surface-50 border border-surface-200 text-xs space-y-1.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono font-bold text-primary-600">{s.suspectId}</span>
                          <h4 className="font-bold text-surface-900">{cleanName}</h4>
                          {cleanAlias && <p className="text-[10px] text-surface-500 font-mono">Alias: "{cleanAlias}"</p>}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.status === 'CONVICTED' ? 'bg-red-100 text-red-700' :
                          s.status === 'ACCUSED' ? 'bg-amber-100 text-amber-700' :
                          s.status === 'DISCHARGED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {s.status}
                        </span>
                      </div>

                      <p className="text-[11px] text-surface-600">
                        Arrest Status: <b>{s.arrestStatus?.isArrested ? `ARRESTED (${s.arrestStatus.custodyLocation || 'Lockup'})` : 'AT LARGE'}</b>
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Resolution Details Card (if resolved) */}
          {complaint.resolutionDetails?.summary && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Case Resolution & Investigation Summary
              </div>
              <p className="text-emerald-900 leading-relaxed font-medium">{complaint.resolutionDetails.summary}</p>
              {complaint.resolutionDetails.suspectOutcome && (
                <p className="text-emerald-800 text-[11px]"><b>Suspect Outcome:</b> {complaint.resolutionDetails.suspectOutcome}</p>
              )}
              {complaint.resolutionDetails.courtOutcome && (
                <p className="text-emerald-800 text-[11px]"><b>Court Outcome:</b> {complaint.resolutionDetails.courtOutcome}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Case Updates Timeline & Add Note */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Chronological Case Updates & Internal Notes" icon={MessageSquare}>
            {/* Add Case Update Form */}
            <form onSubmit={handleAddCaseUpdate} className="space-y-3 pb-4 border-b border-surface-100 text-xs">
              <textarea
                value={updateNote}
                onChange={(e) => setUpdateNote(e.target.value)}
                placeholder="Enter investigation progress update, evidence note, or case activity..."
                className="input h-20"
                required
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <select value={updateType} onChange={(e) => setUpdateType(e.target.value)} className="select text-xs">
                    <option value="GENERAL">General Update</option>
                    <option value="INVESTIGATION">Investigation Progress</option>
                    <option value="EVIDENCE">Evidence Collected</option>
                    <option value="SUSPECT">Suspect Interrogation</option>
                    <option value="INTERNAL_NOTE">🔒 Internal Police Note</option>
                  </select>

                  <label className="flex items-center gap-1.5 text-surface-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCitizenVisible}
                      onChange={(e) => setIsCitizenVisible(e.target.checked)}
                      className="rounded border-surface-300 text-primary-600 focus:ring-0"
                    />
                    <span>Visible to Complainant</span>
                  </label>
                </div>

                <button type="submit" disabled={addingUpdate} className="btn btn-primary btn-sm gap-1">
                  <Plus className="h-3.5 w-3.5" /> Post Case Update
                </button>
              </div>
            </form>

            {/* Updates Timeline List */}
            <div className="space-y-3 pt-2">
              {(!complaint.caseUpdates || complaint.caseUpdates.length === 0) ? (
                <p className="text-xs text-surface-400 italic py-4 text-center">No case updates posted yet.</p>
              ) : (
                complaint.caseUpdates.slice().reverse().map((up, idx) => (
                  <div key={idx} className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                    up.isCitizenVisible ? 'bg-white border-surface-200' : 'bg-amber-50/60 border-amber-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-surface-900">{up.addedBy?.name || 'Police Officer'}</span>
                        <span className="badge badge-gray">{up.addedBy?.role?.replace(/_/g, ' ') || 'OFFICER'}</span>
                        <span className="text-[10px] font-mono font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                          {up.updateType}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-surface-400 font-mono">
                        {up.isCitizenVisible ? (
                          <span className="text-success-700 font-bold">👁️ Citizen Notified</span>
                        ) : (
                          <span className="text-amber-800 font-bold flex items-center gap-1"><Lock className="h-3 w-3" /> Internal Only</span>
                        )}
                        <span>{new Date(up.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="text-surface-800 leading-relaxed pt-1">{up.note}</p>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>

        {/* Evidence & Map */}
        <div className="space-y-6">
          <SectionCard title={`Evidence Files (${complaint.evidence?.length || 0})`} icon={Shield}>
            {(!complaint.evidence || complaint.evidence.length === 0) ? (
              <p className="text-xs text-surface-400 italic py-4 text-center">No evidence attached.</p>
            ) : (
              <div className="space-y-2">
                {complaint.evidence.map((ev, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-surface-50 border border-surface-200 flex items-center justify-between text-xs">
                    <div className="truncate pr-2">
                      <p className="font-semibold text-surface-900 truncate">{ev.originalName}</p>
                      <p className="text-[10px] text-surface-400 font-mono">{ev.type}</p>
                    </div>
                    <a href={ev.path} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm text-[10px]">View</a>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <div className="card p-4">
            <h2 className="text-xs font-bold text-surface-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary-500" /> Incident Location GIS
            </h2>
            <PoliceMap complaints={[complaint]} height="h-[280px]" title="Crime GIS Location" />
          </div>
        </div>
      </div>

      {/* Suspect Modal (Search & Link or Create) */}
      {suspectModalOpen && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-surface-200">
              <h2 className="text-base font-bold text-surface-900">Add or Link Suspect / Accused</h2>
              <button onClick={() => setSuspectModalOpen(false)}><X className="h-5 w-5 text-surface-400" /></button>
            </div>

            {/* Search Existing Suspects */}
            <div className="space-y-2">
              <label className="input-label">Search Existing Suspect Directory First</label>
              <form onSubmit={handleSearchSuspects} className="flex gap-2">
                <input
                  type="text"
                  value={suspectSearchQuery}
                  onChange={(e) => setSuspectSearchQuery(e.target.value)}
                  placeholder="Enter name, alias, or suspect ID..."
                  className="input flex-1 text-xs"
                />
                <button type="submit" className="btn btn-secondary btn-sm">Search</button>
              </form>

              {searchResults.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto border border-surface-200 rounded-xl p-2 bg-surface-50">
                  {searchResults.map(s => (
                    <div key={s._id} className="p-2 bg-white rounded-lg border border-surface-200 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-mono font-bold text-primary-600">{s.suspectId}</span>
                        <p className="font-bold text-surface-900">{s.name} ({s.status})</p>
                      </div>
                      <button onClick={() => handleLinkSuspect(s._id)} className="btn btn-primary btn-sm text-[10px]">Link to Case</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create New Suspect Form */}
            <form onSubmit={handleCreateNewSuspect} className="pt-3 border-t border-surface-200 space-y-3 text-xs">
              <span className="font-bold text-surface-800 uppercase text-[10px] block">Or Register New Suspect for this Case</span>
              <div>
                <label className="input-label">Full Name *</label>
                <input type="text" required value={newSuspectForm.name} onChange={(e) => setNewSuspectForm({ ...newSuspectForm, name: e.target.value })} className="input" placeholder="e.g. Rahul Singh" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Alias</label>
                  <input type="text" value={newSuspectForm.alias} onChange={(e) => setNewSuspectForm({ ...newSuspectForm, alias: e.target.value })} className="input" placeholder="e.g. Chhota" />
                </div>
                <div>
                  <label className="input-label">Legal Classification</label>
                  <select value={newSuspectForm.status} onChange={(e) => setNewSuspectForm({ ...newSuspectForm, status: e.target.value })} className="select">
                    <option value="SUSPECT">SUSPECT</option>
                    <option value="ACCUSED">ACCUSED</option>
                    <option value="CONVICTED">CONVICTED</option>
                    <option value="DISCHARGED">DISCHARGED</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setSuspectModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Create & Link Suspect</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Case Resolution Modal */}
      {resolveModalOpen && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-surface-200">
              <h2 className="text-base font-bold text-surface-900">Resolve & Close Case File</h2>
              <button onClick={() => setResolveModalOpen(false)}><X className="h-5 w-5 text-surface-400" /></button>
            </div>

            <form onSubmit={handleExecuteResolution} className="space-y-3 text-xs">
              <div>
                <label className="input-label">Final Investigation Summary *</label>
                <textarea
                  required
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  placeholder="Detail the final investigation findings and case outcome..."
                  className="input h-24"
                />
              </div>

              <div>
                <label className="input-label">Suspect / Accused Outcome</label>
                <input
                  type="text"
                  value={suspectOutcome}
                  onChange={(e) => setSuspectOutcome(e.target.value)}
                  placeholder="e.g. Accused arrested and remanded to judicial custody"
                  className="input"
                />
              </div>

              <div>
                <label className="input-label">Court / Judicial Status (if applicable)</label>
                <input
                  type="text"
                  value={courtOutcomeNote}
                  onChange={(e) => setCourtOutcomeNote(e.target.value)}
                  placeholder="e.g. Chargesheet filed under BNS Sec 303 in District Court"
                  className="input"
                />
              </div>

              <div className="pt-3 border-t border-surface-200 flex justify-end gap-2">
                <button type="button" onClick={() => setResolveModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" disabled={resolving} className="btn btn-emerald bg-emerald-600 text-white hover:bg-emerald-700 btn-sm font-bold">
                  {resolving ? 'Closing...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Officer & Status Modals */}
      {assignModalOpen && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-surface-200">
              <h2 className="text-base font-bold text-surface-900">Assign Officer</h2>
              <button onClick={() => setAssignModalOpen(false)}><X className="h-5 w-5 text-surface-400" /></button>
            </div>
            <form onSubmit={handleAssignOfficer} className="space-y-4 text-xs">
              <select required value={selectedOfficerUserId} onChange={(e) => setSelectedOfficerUserId(e.target.value)} className="select">
                <option value="">Choose officer...</option>
                {officers.map((off) => (
                  <option key={off.userId?._id} value={off.userId?._id}>
                    {off.userId?.name} ({off.rank} - {off.badgeNumber})
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setAssignModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" disabled={assigning} className="btn btn-primary btn-sm">{assigning ? 'Assigning...' : 'Assign'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {statusModalOpen && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-surface-200">
              <h2 className="text-base font-bold text-surface-900">Update Complaint Status</h2>
              <button onClick={() => setStatusModalOpen(false)}><X className="h-5 w-5 text-surface-400" /></button>
            </div>
            <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="select">
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="INVESTIGATION">INVESTIGATION</option>
                <option value="FIR_REGISTERED">FIR_REGISTERED</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setStatusModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" disabled={updatingStatus} className="btn btn-primary btn-sm">{updatingStatus ? 'Updating...' : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Evidence Modal */}
      {uploadModalOpen && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-surface-200">
              <h2 className="text-base font-bold text-surface-900">Upload Digital Evidence File</h2>
              <button onClick={() => setUploadModalOpen(false)}><X className="h-5 w-5 text-surface-400" /></button>
            </div>
            <form onSubmit={handleUploadEvidence} className="space-y-4 text-xs">
              <div>
                <label className="input-label">Select File (Image, Video, PDF, Document)</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setEvidenceFile(e.target.files[0])}
                  className="input p-2"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setUploadModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" disabled={uploading} className="btn btn-primary btn-sm">{uploading ? 'Uploading...' : 'Upload File'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintDetails;
