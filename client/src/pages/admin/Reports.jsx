import React, { useState, useEffect } from 'react';
import { reportApi } from '../../api/report.api';
import { LoadingSpinner, ErrorState, PageHeader, SectionCard, StatCard } from '../../components/common/CommonUI';
import { BarChart3, Calendar, Sparkles, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

const Reports = () => {
  const [reports, setReports]                 = useState([]);
  const [selectedReport, setSelectedReport]   = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState('');
  const [reportDate, setReportDate]           = useState(new Date().toISOString().split('T')[0]);
  const [generating, setGenerating]           = useState(false);

  const fetchReports = async () => {
    try {
      const res = await reportApi.getDailyReports();
      if (res.success && res.data?.reports) {
        setReports(res.data.reports);
        if (res.data.reports.length > 0) {
          setSelectedReport(res.data.reports[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch daily reports:', err);
      setError(err.response?.data?.message || err.message || 'Daily reports unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    if (!reportDate) return;
    setGenerating(true);
    try {
      const res = await reportApi.generateDailyReport(reportDate);
      if (res.success && res.data?.report) {
        alert(`Daily Safety Report generated for ${reportDate}!`);
        fetchReports();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate daily report');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <LoadingSpinner message="Fetching Daily Safety Intelligence Reports..." />;
  if (error)   return <ErrorState message={error} onRetry={fetchReports} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-6 w-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-surface-900">Daily Safety Intelligence Reports</h1>
          </div>
          <p className="text-sm text-surface-500">Automated AI-assisted daily crime activity summaries and metrics</p>
        </div>

        {/* Generate Date Form */}
        <form onSubmit={handleGenerateReport} className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-surface-200 shadow-card">
          <input
            type="date"
            required
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="input text-xs py-2"
          />
          <button
            type="submit"
            disabled={generating}
            className="btn btn-primary text-xs gap-2 whitespace-nowrap"
          >
            <Sparkles className="h-4 w-4" /> {generating ? 'Generating...' : 'Generate Report'}
          </button>
        </form>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports Archive List */}
        <div className="card p-5">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-surface-100">
            <Calendar className="h-4 w-4 text-primary-500" />
            <h2 className="text-sm font-semibold text-surface-800">Daily Reports Archive</h2>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {reports.length === 0 ? (
              <p className="text-xs text-surface-400 py-6 text-center">No reports generated yet.</p>
            ) : (
              reports.map((rep) => (
                <div
                  key={rep._id}
                  onClick={() => setSelectedReport(rep)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedReport?._id === rep._id
                      ? 'bg-primary-50 border-primary-300 font-semibold text-primary-900 shadow-sm'
                      : 'bg-surface-50 border-surface-200 text-surface-600 hover:bg-surface-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold">{new Date(rep.date).toLocaleDateString()}</span>
                    <span className="text-[10px] text-surface-500 font-mono bg-white px-2 py-0.5 rounded-full border border-surface-200">
                      {rep.totalComplaints} Filings
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Report Dossier Viewer */}
        <div className="lg:col-span-2 card p-6">
          {!selectedReport ? (
            <div className="py-16 text-center text-sm text-surface-400">Select a report from the archive to view details.</div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-surface-100 pb-4 gap-2">
                <div>
                  <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary-600" /> Daily Intelligence Briefing
                  </h2>
                  <p className="text-xs font-mono text-primary-600 mt-0.5 font-semibold">
                    DATE: {new Date(selectedReport.date).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs text-surface-400 font-mono">
                  Generated: {new Date(selectedReport.createdAt).toLocaleTimeString()}
                </span>
              </div>

              {/* AI Generated Executive Summary */}
              <div className="p-5 rounded-2xl bg-warning-50/50 border border-warning-200 space-y-2">
                <h3 className="text-xs font-bold text-warning-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-warning-600" /> AI Executive Summary
                </h3>
                <p className="text-xs text-surface-700 leading-relaxed">{selectedReport.summary}</p>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-4 bg-surface-50 rounded-2xl border border-surface-100">
                  <p className="text-[10px] text-surface-400 uppercase font-semibold">Total Complaints</p>
                  <p className="text-2xl font-bold text-surface-900 mt-1 font-mono">{selectedReport.totalComplaints}</p>
                </div>
                <div className="p-4 bg-danger-50/50 rounded-2xl border border-danger-100">
                  <p className="text-[10px] text-danger-600 uppercase font-semibold">Active SOS</p>
                  <p className="text-2xl font-bold text-danger-700 mt-1 font-mono">{selectedReport.activeSOS}</p>
                </div>
                <div className="p-4 bg-success-50/50 rounded-2xl border border-success-100">
                  <p className="text-[10px] text-success-600 uppercase font-semibold">Cases Resolved</p>
                  <p className="text-2xl font-bold text-success-700 mt-1 font-mono">{selectedReport.resolvedCases}</p>
                </div>
              </div>

              {/* Crime Breakdown */}
              {selectedReport.crimeBreakdown && (
                <div>
                  <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2 font-mono">Crime Type Breakdown</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(selectedReport.crimeBreakdown).map(([type, count]) => (
                      <div key={type} className="p-2.5 bg-surface-50 rounded-xl border border-surface-100 text-xs flex justify-between">
                        <span className="text-surface-600 font-medium">{type.replace(/_/g, ' ')}</span>
                        <span className="font-bold text-surface-900 font-mono">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* High Risk Areas */}
              {selectedReport.highRiskAreas && selectedReport.highRiskAreas.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2 font-mono">High Risk Jurisdictional Areas</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedReport.highRiskAreas.map((area, idx) => (
                      <span key={idx} className="px-3 py-1 bg-danger-50 border border-danger-200 text-danger-700 text-xs font-medium rounded-full flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" /> {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
