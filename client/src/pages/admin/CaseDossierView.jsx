import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { caseDossierApi } from '../../api/caseRecord.api';
import { LoadingSpinner, ErrorState, StatusBadge, PageHeader } from '../../components/common/CommonUI';
import { FileText, Shield, User, Building2, Scale, Clock, CheckCircle2, AlertTriangle, ArrowRight, UserCheck, FolderOpen } from 'lucide-react';

const CaseDossierView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const fetchDossier = async () => {
      try {
        setLoading(true);
        const res = await caseDossierApi.getDossier(id);
        if (res.success && res.data?.dossier) {
          setDossier(res.data.dossier);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to compile case dossier graph');
      } finally {
        setLoading(false);
      }
    };
    fetchDossier();
  }, [id]);

  if (loading) return <LoadingSpinner message="Building Interconnected Case Dossier Graph..." />;
  if (error) return <ErrorState message={error} onRetry={() => navigate(-1)} />;

  const { complaint, fir, suspects, evidence, officer, station, timeline, courtOutcome } = dossier || {};

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        title={`Case Dossier: ${fir?.firNumber || complaint?.complaintId || 'RECORD'}`}
        subtitle="End-to-End Interconnected Investigation Graph (Complaint → FIR → Evidence → Suspect → Officer → Station → Court)"
        icon={FolderOpen}
      />

      {/* Case Graph Chain Nodes */}
      <div className="card p-4 bg-white border border-surface-200 shadow-card">
        <h3 className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">Investigation Chain Nodes</h3>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
            <FileText className="h-4 w-4 text-amber-600" />
            <div>
              <p className="text-[10px] text-amber-600 font-bold uppercase">1. Citizen Complaint</p>
              <p className="text-surface-900 font-mono">{complaint?.complaintId || 'N/A'}</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-surface-300 hidden sm:block" />

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-[10px] text-blue-600 font-bold uppercase">2. Registered FIR</p>
              <p className="text-surface-900 font-mono">{fir?.firNumber || 'Pending FIR'}</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-surface-300 hidden sm:block" />

          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-purple-600" />
            <div>
              <p className="text-[10px] text-purple-600 font-bold uppercase">3. Suspects / Accused</p>
              <p className="text-surface-900 font-mono">{suspects?.length || 0} Listed</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-surface-300 hidden sm:block" />

          <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
            <User className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-[10px] text-green-600 font-bold uppercase">4. Assigned IO</p>
              <p className="text-surface-900">{officer?.name || 'Unassigned'}</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-surface-300 hidden sm:block" />

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
            <Scale className="h-4 w-4 text-slate-600" />
            <div>
              <p className="text-[10px] text-slate-600 font-bold uppercase">5. Court Outcome</p>
              <p className="text-surface-900">{courtOutcome?.status || 'NOT_SUBMITTED'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: FIR & Complaint facts */}
        <div className="card p-5 bg-white border border-surface-200 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-surface-100">
            <h3 className="text-xs font-bold text-surface-800 uppercase tracking-wider">FIR & Offence Telemetry</h3>
            {fir?.status && <StatusBadge status={fir.status} />}
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-surface-500">Crime Category: <b className="text-surface-900">{fir?.crimeType || complaint?.crimeType}</b></p>
            <p className="text-surface-500">Incident Location: <b className="text-surface-900">{complaint?.location?.address || 'N/A'}</b></p>
            <div className="p-3 bg-surface-50 rounded-xl border border-surface-100 mt-2">
              <span className="text-[10px] font-bold text-surface-400 uppercase block mb-1">Crime Description / Statement</span>
              <p className="text-surface-700 leading-relaxed">{fir?.description || complaint?.description}</p>
            </div>
          </div>

          {/* Legal Sections under BNS / IPC */}
          {fir?.legalSections?.length > 0 && (
            <div className="pt-2 border-t border-surface-100 space-y-2">
              <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">Invoked Statutory Sections</span>
              <div className="flex flex-wrap gap-2">
                {fir.legalSections.map((s, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs font-mono font-bold">
                    {s.act} {s.section} - {s.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Suspects & Evidence */}
        <div className="card p-5 bg-white border border-surface-200 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-surface-100">
            <h3 className="text-xs font-bold text-surface-800 uppercase tracking-wider">Suspects & Evidence Registry</h3>
            <span className="badge badge-gray">{suspects?.length || 0} Suspects · {evidence?.length || 0} Evidences</span>
          </div>

          {/* Suspect List */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">Linked Suspects / Accused</span>
            {(!suspects || suspects.length === 0) ? (
              <p className="text-xs text-surface-400 italic">No suspects explicitly linked yet.</p>
            ) : (
              suspects.map(s => (
                <div key={s._id} className="p-3 bg-surface-50 border border-surface-100 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-primary-600">{s.suspectId}</span>
                    <p className="font-bold text-surface-900">{s.name} ({s.status})</p>
                  </div>
                  <span className="badge badge-amber">{s.status}</span>
                </div>
              ))
            )}
          </div>

          {/* Evidence Registry */}
          <div className="pt-2 border-t border-surface-100 space-y-2">
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">Chain of Custody Evidence</span>
            {(!evidence || evidence.length === 0) ? (
              <p className="text-xs text-surface-400 italic">No evidence recorded.</p>
            ) : (
              evidence.map((e, idx) => (
                <div key={idx} className="p-3 bg-surface-50 border border-surface-100 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between font-semibold text-surface-800">
                    <span>{e.originalName || e.title || 'Evidence Item'}</span>
                    <span className="text-[10px] text-surface-400 font-mono">{e.type}</span>
                  </div>
                  <p className="text-[11px] text-surface-500 font-mono">Source: {e.source}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseDossierView;
