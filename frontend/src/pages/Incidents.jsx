import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Flame,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  ChevronRight,
  X,
  Activity,
  FileText,
  ShieldAlert,
  Terminal,
  Cpu,
  Sliders,
  Send,
  Zap,
} from 'lucide-react';

export const Incidents = () => {
  const [summary, setSummary] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState('incidents'); // 'incidents' | 'alerts'
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newIncidentData, setNewIncidentData] = useState({
    title: '',
    service_name: '',
    severity: 'high',
    description: '',
  });

  // Action status
  const [actionLoading, setActionLoading] = useState(false);
  const [notesDraft, setNotesDraft] = useState({ root_cause: '', resolution_notes: '' });
  const [successMsg, setSuccessMsg] = useState(null);
  const [evalResult, setEvalResult] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, incRes, altRes] = await Promise.all([
        api.get('/incidents/summary'),
        api.get('/incidents'),
        api.get('/incidents/alerts/list'),
      ]);
      setSummary(sumRes.data);
      setIncidents(incRes.data);
      setAlerts(altRes.data);

      if (selectedIncident) {
        const updated = incRes.data.find((i) => i.id === selectedIncident.id);
        if (updated) {
          setSelectedIncident(updated);
          setNotesDraft({
            root_cause: updated.root_cause || '',
            resolution_notes: updated.resolution_notes || '',
          });
        }
      }
    } catch (err) {
      console.error('Failed to load incident management telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openIncidentDrawer = (inc) => {
    setSelectedIncident(inc);
    setNotesDraft({
      root_cause: inc.root_cause || '',
      resolution_notes: inc.resolution_notes || '',
    });
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedIncident) return;
    try {
      setActionLoading(true);
      const res = await api.patch(`/incidents/${selectedIncident.id}`, {
        status: newStatus,
        root_cause: notesDraft.root_cause,
        resolution_notes: notesDraft.resolution_notes,
      });
      setSelectedIncident(res.data);
      setIncidents((prev) => prev.map((i) => (i.id === res.data.id ? res.data : i)));
      setSuccessMsg(`Incident transitioned to ${newStatus.toUpperCase()}`);
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchData();
    } catch (err) {
      console.error('Status transition error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedIncident) return;
    try {
      setActionLoading(true);
      const res = await api.patch(`/incidents/${selectedIncident.id}`, {
        root_cause: notesDraft.root_cause,
        resolution_notes: notesDraft.resolution_notes,
      });
      setSelectedIncident(res.data);
      setSuccessMsg('Investigation notes and root cause updated.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to update notes:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCorrelate = async () => {
    if (!selectedIncident) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/incidents/${selectedIncident.id}/correlate`);
      setSelectedIncident(res.data);
      setSuccessMsg('Re-correlated telemetry against live Golden Signals & Loki logs.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to re-correlate evidence:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await api.post('/incidents', newIncidentData);
      setShowCreateModal(false);
      setNewIncidentData({ title: '', service_name: '', severity: 'high', description: '' });
      setIncidents((prev) => [res.data, ...prev]);
      openIncidentDrawer(res.data);
      setSuccessMsg(`Incident declared: ${res.data.title}`);
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchData();
    } catch (err) {
      console.error('Failed to create incident:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEvaluateAlert = async (alertId) => {
    try {
      setActionLoading(true);
      setEvalResult(null);
      const res = await api.post(`/incidents/alerts/${alertId}/evaluate`);
      setEvalResult(res.data);
      fetchData();
    } catch (err) {
      console.error('Failed to evaluate alert rule:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredIncidents = incidents.filter((i) => {
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || i.severity === severityFilter;
    return matchesStatus && matchesSeverity;
  });

  const parsedMetrics = selectedIncident?.evidence_metrics
    ? JSON.parse(selectedIncident.evidence_metrics)
    : null;
  const parsedLogs = selectedIncident?.evidence_logs
    ? JSON.parse(selectedIncident.evidence_logs)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Incident Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-red-500/10 text-red-400 border border-red-500/20">
              SRE War Room
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Empirical incident declaration, automated Golden Signal evidence correlation, and MTTR tracking.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-card border border-border text-slate-300 hover:text-white hover:bg-slate-800 transition text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-sm transition shadow-lg shadow-red-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Declare Incident</span>
          </button>
        </div>
      </div>

      {/* Telemetry Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Active Incidents</p>
            <p className="text-2xl font-bold font-mono text-white mt-1">
              {summary ? summary.total_active : 0}
            </p>
            <span className="text-[11px] text-amber-400">Open or Investigating</span>
          </div>
          <Flame className="w-8 h-8 text-amber-500/20" />
        </div>

        <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Critical Severity</p>
            <p className="text-2xl font-bold font-mono text-red-400 mt-1">
              {summary ? summary.critical_count : 0}
            </p>
            <span className="text-[11px] text-red-400">Requires Immediate Action</span>
          </div>
          <AlertCircle className="w-8 h-8 text-red-500/20" />
        </div>

        <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">High Severity</p>
            <p className="text-2xl font-bold font-mono text-orange-400 mt-1">
              {summary ? summary.high_count : 0}
            </p>
            <span className="text-[11px] text-orange-400">Degraded Customer Impact</span>
          </div>
          <AlertTriangle className="w-8 h-8 text-orange-500/20" />
        </div>

        <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Mean Time to Resolve (MTTR)</p>
            <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {summary ? `${summary.mean_time_to_resolve_minutes}m` : '0m'}
            </p>
            <span className="text-[11px] text-emerald-400">Across Resolved Outages</span>
          </div>
          <Clock className="w-8 h-8 text-emerald-500/20" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-border text-sm font-medium">
        <button
          onClick={() => setActiveTab('incidents')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-medium text-xs transition ${
            activeTab === 'incidents'
              ? 'border-red-500 text-red-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Incident Stream ({incidents.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-medium text-xs transition ${
            activeTab === 'alerts'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Alerting Rules ({alerts.length})</span>
        </button>
      </div>

      {/* Tab 1: Incidents Stream */}
      {activeTab === 'incidents' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Incident List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filter bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Status:</span>
                {['all', 'open', 'investigating', 'resolved'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition uppercase ${
                      statusFilter === st
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Severity:</span>
                {['all', 'critical', 'high', 'medium'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition uppercase ${
                      severityFilter === sev
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="space-y-2">
              {filteredIncidents.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                const sevColors = {
                  critical: 'bg-red-500/10 text-red-400 border-red-500/30',
                  high: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
                  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                  low: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
                };
                const statusColors = {
                  open: 'bg-red-500/20 text-red-300',
                  investigating: 'bg-amber-500/20 text-amber-300',
                  resolved: 'bg-emerald-500/20 text-emerald-300',
                  closed: 'bg-slate-800 text-slate-400',
                };

                return (
                  <div
                    key={inc.id}
                    onClick={() => openIncidentDrawer(inc)}
                    className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-800/80 border-red-500/50 shadow-md'
                        : 'bg-card border-border hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
                            sevColors[inc.severity] || sevColors.medium
                          }`}
                        >
                          {inc.severity}
                        </span>
                        <h3 className="font-semibold text-sm text-white">{inc.title}</h3>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono">
                        <span>Service: {inc.service_name}</span>
                        <span>•</span>
                        <span>{new Date(inc.detected_at).toLocaleString()}</span>
                        <span>•</span>
                        <span>Assigned: {inc.assigned_to || 'Unassigned'}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                          statusColors[inc.status] || statusColors.open
                        }`}
                      >
                        {inc.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                );
              })}

              {filteredIncidents.length === 0 && !loading && (
                <div className="p-8 rounded-xl border border-dashed border-border text-center text-slate-500 text-sm">
                  No incidents match the active filters.
                </div>
              )}
            </div>
          </div>

          {/* Incident Drawer / War Room Panel */}
          <div className="lg:col-span-1">
            {selectedIncident ? (
              <div className="p-5 rounded-xl bg-card border border-border space-y-5 sticky top-6">
                <div className="flex items-start justify-between border-b border-border/60 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      Incident #{selectedIncident.id.slice(0, 8)}
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">{selectedIncident.title}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedIncident(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Status Transitions */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Operational State Transition
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      disabled={actionLoading}
                      onClick={() => handleStatusChange('investigating')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        selectedIncident.status === 'investigating'
                          ? 'bg-amber-500 text-black'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      Investigate
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleStatusChange('resolved')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        selectedIncident.status === 'resolved'
                          ? 'bg-emerald-500 text-black'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      Resolve
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleStatusChange('closed')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        selectedIncident.status === 'closed'
                          ? 'bg-slate-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      Close
                    </button>
                  </div>
                </div>

                {/* Correlated Empirical Evidence */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <Activity className="w-3.5 h-3.5 text-blue-400" />
                      <span>Correlated Evidence</span>
                    </label>
                    <button
                      onClick={handleCorrelate}
                      disabled={actionLoading}
                      className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Re-Correlate</span>
                    </button>
                  </div>

                  {parsedMetrics && (
                    <div className="p-3 rounded-lg bg-[#222831] border border-border/60 space-y-2 mb-3">
                      <p className="text-[11px] font-semibold text-slate-300">Prometheus Telemetry Anomaly:</p>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        {Object.entries(parsedMetrics).map(([k, v]) => (
                          <div key={k} className="p-1.5 rounded bg-slate-900 border border-slate-800">
                            <p className="text-[10px] text-slate-400 uppercase">{k.replace(/_/g, ' ')}</p>
                            <p className="text-red-400 font-bold mt-0.5">{String(v)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {parsedLogs && parsedLogs.length > 0 && (
                    <div className="p-3 rounded-lg bg-[#222831] border border-border/60 space-y-2">
                      <p className="text-[11px] font-semibold text-slate-300">Correlated Loki Log Stream:</p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {parsedLogs.map((log, idx) => (
                          <div key={idx} className="p-1.5 rounded bg-slate-900/80 font-mono text-[10px]">
                            <span className="text-red-400 font-bold mr-1.5">[{log.level}]</span>
                            <span className="text-slate-300">{log.line}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Root Cause & Post-Mortem Notes */}
                <div className="space-y-3 border-t border-border/60 pt-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Root Cause Analysis</label>
                    <textarea
                      value={notesDraft.root_cause}
                      onChange={(e) => setNotesDraft({ ...notesDraft, root_cause: e.target.value })}
                      rows={3}
                      placeholder="Identified root cause (e.g. Memory leak in v1.2 worker)"
                      className="w-full p-2.5 bg-[#222831] border border-border rounded-lg text-xs text-white focus:outline-none focus:border-red-500 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Resolution & Post-Mortem Notes</label>
                    <textarea
                      value={notesDraft.resolution_notes}
                      onChange={(e) => setNotesDraft({ ...notesDraft, resolution_notes: e.target.value })}
                      rows={3}
                      placeholder="Steps taken to mitigate and prevent future occurrence"
                      className="w-full p-2.5 bg-[#222831] border border-border rounded-lg text-xs text-white focus:outline-none focus:border-red-500 font-sans"
                    />
                  </div>

                  <button
                    disabled={actionLoading}
                    onClick={handleSaveNotes}
                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition"
                  >
                    {actionLoading ? 'Saving...' : 'Save Post-Mortem Notes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-card border border-border text-center text-slate-500 text-xs">
                Select an incident from the stream to inspect correlated telemetry, update lifecycle status, and author post-mortem notes.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Alert Rules */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider px-1">
            <span>Automated Telemetry Threshold Rules</span>
            <span>PromQL Evaluation Engine</span>
          </div>

          {evalResult && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                evalResult.is_breached
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
            >
              <div className="flex items-center space-x-3 text-xs">
                {evalResult.is_breached ? (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                )}
                <div>
                  <span className="font-bold">Evaluation for {evalResult.alert_name}:</span> Observed metric value{' '}
                  <span className="font-mono">{evalResult.metric_value.toFixed(2)}</span> vs threshold{' '}
                  <span className="font-mono">{evalResult.threshold_value}</span>. Status:{' '}
                  <span className="font-bold uppercase">
                    {evalResult.is_breached ? 'BREACHED (Incident Triggered)' : 'NORMAL'}
                  </span>
                </div>
              </div>
              <button onClick={() => setEvalResult(null)} className="text-xs hover:underline">
                Dismiss
              </button>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/60">
            {alerts.map((alt) => (
              <div key={alt.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                        alt.severity === 'critical'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {alt.severity}
                    </span>
                    <h4 className="font-semibold text-sm text-white">{alt.name}</h4>
                  </div>
                  <p className="text-xs font-mono text-slate-400">
                    Metric: {alt.metric_name} ({alt.condition} {alt.threshold} for {alt.duration})
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleEvaluateAlert(alt.id)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Evaluate Live Telemetry</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Declare Incident Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#393E46] border border-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Flame className="w-4 h-4 text-red-500" />
                <span>Declare Production Incident</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Incident Title</label>
                <input
                  type="text"
                  required
                  value={newIncidentData.title}
                  onChange={(e) => setNewIncidentData({ ...newIncidentData, title: e.target.value })}
                  placeholder="e.g. Payment Gateway Error Rate Spike"
                  className="w-full px-3 py-2 bg-[#222831] border border-border rounded-lg text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Impacted Service</label>
                  <input
                    type="text"
                    required
                    value={newIncidentData.service_name}
                    onChange={(e) => setNewIncidentData({ ...newIncidentData, service_name: e.target.value })}
                    placeholder="e.g. payment-service"
                    className="w-full px-3 py-2 bg-[#222831] border border-border rounded-lg text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Severity</label>
                  <select
                    value={newIncidentData.severity}
                    onChange={(e) => setNewIncidentData({ ...newIncidentData, severity: e.target.value })}
                    className="w-full px-3 py-2 bg-[#222831] border border-border rounded-lg text-sm text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="critical">CRITICAL (P1)</option>
                    <option value="high">HIGH (P2)</option>
                    <option value="medium">MEDIUM (P3)</option>
                    <option value="low">LOW (P4)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Observed Symptoms / Description</label>
                <textarea
                  value={newIncidentData.description}
                  onChange={(e) => setNewIncidentData({ ...newIncidentData, description: e.target.value })}
                  rows={4}
                  placeholder="Describe observed anomaly, user impact, and immediate symptoms"
                  className="w-full px-3 py-2 bg-[#222831] border border-border rounded-lg text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-card border border-border text-slate-300 hover:text-white text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-xs transition"
                >
                  {actionLoading ? 'Declaring...' : 'Declare Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

