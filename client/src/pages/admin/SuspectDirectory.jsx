import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { suspectApi } from '../../api/caseRecord.api';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, ErrorState, PageHeader, EmptyState } from '../../components/common/CommonUI';
import { UserCheck, Search, Plus, Filter, FolderOpen, X } from 'lucide-react';

const STATUS_OPTIONS = ['SUSPECT', 'ACCUSED', 'CONVICTED', 'DISCHARGED'];

const cleanDisplayField = (val) => {
  if (!val) return '';
  return val
    .replace(/^(?:Full\s*Name\s*)?(?:Alias\s*)?(?:Legal\s*Classification\s*)?/gi, '')
    .replace(/^(?:Name|Suspect\s*Name|Alias|Known\s*As)\s*[:\-]\s*/gi, '')
    .trim();
};

const SuspectDirectory = () => {
  const [suspects, setSuspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSuspect, setSelectedSuspect] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isPoliceScope = location.pathname.startsWith('/police') || user?.role !== 'CONTROL_ROOM_ADMIN';
  const basePath = isPoliceScope ? '/police' : '/admin';

  // Form State
  const [formData, setFormData] = useState({
    name: '', alias: '', gender: 'MALE', age: '', phone: '', address: '', status: 'SUSPECT', firId: '', complaintId: ''
  });

  const fetchSuspects = async () => {
    try {
      setLoading(true);
      const res = await suspectApi.getAll({ search, status: statusFilter });
      if (res.success && res.data?.suspects) {
        setSuspects(res.data.suspects);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load suspect records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuspects();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSuspects();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await suspectApi.create(formData);
      if (res.success) {
        setIsModalOpen(false);
        setFormData({ name: '', alias: '', gender: 'MALE', age: '', phone: '', address: '', status: 'SUSPECT', firId: '', complaintId: '' });
        fetchSuspects();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create suspect record');
    }
  };

  if (loading) return <LoadingSpinner message="Accessing Criminal & Suspect Directory..." />;
  if (error) return <ErrorState message={error} onRetry={fetchSuspects} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Criminal & Suspect Directory"
        subtitle="Searchable dossier registry linking Suspect, Accused, Convicted & Discharged individuals to FIRs and Case Files"
        icon={UserCheck}
        action={
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-sm gap-2">
            <Plus className="h-4 w-4" /> Register Suspect Record
          </button>
        }
      />

      {/* Search & Filter Bar */}
      <div className="card p-4 bg-white border border-surface-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-surface-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Suspect ID, Name, Alias, Phone, FIR Number, or Complaint ID..."
              className="input pl-9 text-xs"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-surface-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select text-xs"
          >
            <option value="">All Classifications</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="card overflow-hidden bg-white border border-surface-200">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th>Record ID</th>
                <th>Full Name & Alias</th>
                <th>Classification</th>
                <th>Arrest / Custody Status</th>
                <th>Linked FIRs / Cases</th>
                <th>Jurisdiction Station</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {suspects.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12">
                    <EmptyState icon={UserCheck} message="No suspect records found" description="Try searching with Suspect ID, Name, Alias, or FIR Number." />
                  </td>
                </tr>
              ) : (
                suspects.map((s) => {
                  const displayName = cleanDisplayField(s.name) || s.name;
                  const displayAlias = cleanDisplayField(s.alias) || s.alias;

                  return (
                    <tr key={s._id} className="hover:bg-surface-50">
                      <td><span className="font-mono font-bold text-xs text-primary-600">{s.suspectId}</span></td>
                      <td>
                        <div>
                          <p className="font-bold text-xs text-surface-900">{displayName}</p>
                          {displayAlias ? (
                            <p className="text-[10px] text-surface-500 font-mono mt-0.5">
                              Alias: <span className="text-surface-700 font-semibold">"{displayAlias}"</span>
                            </p>
                          ) : (
                            <span className="text-[10px] text-surface-400">No alias recorded</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.status === 'CONVICTED' ? 'bg-red-100 text-red-700 border border-red-200' :
                          s.status === 'ACCUSED' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                          s.status === 'DISCHARGED' ? 'bg-green-100 text-green-700 border border-green-200' :
                          'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td>
                        {s.arrestStatus?.isArrested ? (
                          <span className="text-[11px] font-bold text-danger-700 bg-danger-50 px-2 py-0.5 rounded border border-danger-200">
                            In Custody ({s.arrestStatus.custodyLocation || 'Police Lockup'})
                          </span>
                        ) : (
                          <span className="text-[11px] text-surface-500 font-medium">Not Arrested</span>
                        )}
                      </td>
                      <td>
                        {s.linkedFirIds?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {s.linkedFirIds.map(f => (
                              <span key={f._id || f} className="font-mono text-[10px] bg-surface-100 px-1.5 py-0.5 rounded font-bold text-surface-700">
                                {f.firNumber || f}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-surface-400">No linked FIRs</span>
                        )}
                      </td>
                      <td className="text-xs text-surface-600">{s.stationId?.name || 'Central Jurisdiction'}</td>
                      <td className="text-right flex items-center justify-end gap-1.5 py-3">
                        <button onClick={() => setSelectedSuspect(s)} className="btn btn-secondary btn-sm text-[11px]">
                          View Details
                        </button>
                        {s.linkedFirIds?.[0]?._id && (
                          <button
                            onClick={() => navigate(`${basePath}/cases/dossier/${s.linkedFirIds[0]._id}`)}
                            className="btn btn-primary btn-sm text-[11px] gap-1"
                          >
                            <FolderOpen className="h-3 w-3" /> Dossier Graph
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suspect Detail Modal */}
      {selectedSuspect && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-3xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm">
                  {(cleanDisplayField(selectedSuspect.name) || selectedSuspect.name || 'S')[0]}
                </div>
                <div>
                  <h2 className="text-base font-bold text-surface-900">
                    {cleanDisplayField(selectedSuspect.name) || selectedSuspect.name}
                  </h2>
                  <p className="text-xs text-surface-500 font-mono">
                    ID: <span className="font-bold text-primary-600">{selectedSuspect.suspectId}</span>
                    {' · '}Alias: <span className="font-semibold text-surface-700">{cleanDisplayField(selectedSuspect.alias) || 'N/A'}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedSuspect(null)} className="text-surface-400 hover:text-surface-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-surface-50 rounded-xl border border-surface-200">
                <span className="text-[10px] text-surface-400 uppercase font-bold block">Legal Classification</span>
                <span className="font-bold text-primary-700 mt-1 block">{selectedSuspect.status}</span>
              </div>
              <div className="p-3 bg-surface-50 rounded-xl border border-surface-200">
                <span className="text-[10px] text-surface-400 uppercase font-bold block">Arrest & Custody Status</span>
                <span className="font-bold text-surface-800 mt-1 block">
                  {selectedSuspect.arrestStatus?.isArrested ? `UNDER ARREST (${selectedSuspect.arrestStatus.custodyLocation || 'Lockup'})` : 'AT LARGE / NOT ARRESTED'}
                </span>
              </div>
              <div className="p-3 bg-surface-50 rounded-xl border border-surface-200">
                <span className="text-[10px] text-surface-400 uppercase font-bold block">Contact Details</span>
                <span className="font-semibold text-surface-800 mt-1 block">{selectedSuspect.phone || 'N/A'}</span>
              </div>
            </div>

            {/* Linked Cases List */}
            <div className="p-4 bg-surface-50 rounded-xl space-y-2 text-xs border border-surface-200">
              <span className="text-[10px] text-surface-400 uppercase font-bold block">Linked FIR Cases ({selectedSuspect.linkedFirIds?.length || 0})</span>
              {(!selectedSuspect.linkedFirIds || selectedSuspect.linkedFirIds.length === 0) ? (
                <p className="text-surface-400 italic">No linked FIRs recorded.</p>
              ) : (
                selectedSuspect.linkedFirIds.map(f => (
                  <div key={f._id || f} className="p-2.5 bg-white border border-surface-200 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="font-mono font-bold text-primary-600">{f.firNumber || f}</span>
                      <p className="text-surface-700 font-semibold">{f.crimeType ? `${f.crimeType}: ` : ''}{f.description || 'Formal FIR Document'}</p>
                    </div>
                    <button onClick={() => { setSelectedSuspect(null); navigate(`${basePath}/cases/dossier/${f._id || f}`); }} className="btn btn-primary btn-sm text-[10px]">
                      Open Dossier
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-surface-200 flex justify-end">
              <button onClick={() => setSelectedSuspect(null)} className="btn btn-secondary btn-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-surface-200">
              <h2 className="text-base font-bold text-surface-900">Register New Suspect/Accused Record</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="h-5 w-5 text-surface-400" /></button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="input-label">Full Name *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" placeholder="e.g. Ramesh Singh" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Alias / Known As</label>
                  <input type="text" value={formData.alias} onChange={(e) => setFormData({ ...formData, alias: e.target.value })} className="input" placeholder="e.g. Chhota Don" />
                </div>
                <div>
                  <label className="input-label">Legal Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="select">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Age</label>
                  <input type="number" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} className="input" placeholder="Age" />
                </div>
                <div>
                  <label className="input-label">Phone</label>
                  <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input" placeholder="Phone" />
                </div>
              </div>
              <div>
                <label className="input-label">Address</label>
                <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input" placeholder="Current address" />
              </div>

              <div className="pt-3 border-t border-surface-200 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Register Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuspectDirectory;
