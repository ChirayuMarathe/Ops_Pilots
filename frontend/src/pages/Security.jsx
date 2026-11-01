import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  ShieldCheck,
  KeyRound,
  FileCheck2,
  AlertTriangle,
  Lock,
  Eye,
  Trash2,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Check,
  Server,
  Cloud,
  Terminal,
} from 'lucide-react';

export const Security = () => {
  const [activeTab, setActiveTab] = useState('secrets'); // 'secrets' | 'scans' | 'audit'

  // Secrets State
  const [secrets, setSecrets] = useState([]);
  const [envFilter, setEnvFilter] = useState('production');
  const [showAddSecretModal, setShowAddSecretModal] = useState(false);
  const [newSecretData, setNewSecretData] = useState({
    name: '',
    key: '',
    value: '',
    environment: 'production',
    description: '',
    provider: 'local',
  });
  const [revealedSecret, setRevealedSecret] = useState(null);
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [secretToReveal, setSecretToReveal] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Scans State
  const [scans, setScans] = useState([]);
  const [targetImage, setTargetImage] = useState('opspilot-backend:latest');
  const [selectedScan, setSelectedScan] = useState(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearch, setAuditSearch] = useState('');

  // General Loading/Errors
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchSecrets = async () => {
    try {
      const res = await api.get(`/security/secrets?environment=${envFilter}`);
      setSecrets(res.data);
    } catch (err) {
      console.error('Failed to load secrets:', err);
    }
  };

  const fetchScans = async () => {
    try {
      const res = await api.get('/security/scans');
      setScans(res.data);
      if (res.data.length > 0 && !selectedScan) {
        setSelectedScan(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load scans:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get('/security/audit-logs?limit=50');
      setAuditLogs(res.data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchSecrets(), fetchScans(), fetchAuditLogs()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [envFilter]);

  const handleCreateSecret = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setErrorMsg(null);
      const res = await api.post('/security/secrets', newSecretData);
      setShowAddSecretModal(false);
      setNewSecretData({
        name: '',
        key: '',
        value: '',
        environment: 'production',
        description: '',
        provider: 'local',
      });
      setSuccessMsg(`Secret '${res.data.key}' safely stored.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchSecrets();
      fetchAuditLogs();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to save secret.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReveal = async () => {
    if (!secretToReveal) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      const res = await api.post(`/security/secrets/${secretToReveal.id}/reveal`);
      setRevealedSecret(res.data);
      setShowRevealModal(false);
      fetchAuditLogs();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to decrypt secret.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSecret = async (id, key) => {
    if (!window.confirm(`Permanently delete secret '${key}'?`)) return;
    try {
      await api.delete(`/security/secrets/${id}`);
      fetchSecrets();
      fetchAuditLogs();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to delete secret.');
    }
  };

  const handleTriggerScan = async (image) => {
    try {
      setActionLoading(true);
      setErrorMsg(null);
      const res = await api.post('/security/scans', { image_name: image || targetImage });
      setSelectedScan(res.data);
      setScans((prev) => [res.data, ...prev]);
      setSuccessMsg(`Scan completed for ${res.data.image_name}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchAuditLogs();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Scan execution failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredAudits = auditLogs.filter((a) => {
    if (!auditSearch) return true;
    const s = auditSearch.toLowerCase();
    return (
      a.action.toLowerCase().includes(s) ||
      (a.username && a.username.toLowerCase().includes(s)) ||
      (a.details && a.details.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Security & Governance</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Zero-Trust Vault & Scanning
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Masked secret lifecycle, Trivy container vulnerability scanning, and immutable compliance audit trails.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadAll}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-card border border-border text-slate-300 hover:text-white hover:bg-slate-800 transition text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          {activeTab === 'secrets' && (
            <button
              onClick={() => setShowAddSecretModal(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>New Secret</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert Notices */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{errorMsg}</div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start space-x-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{successMsg}</div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-border text-sm font-medium">
        {[
          { id: 'secrets', label: 'Secrets Vault', icon: KeyRound },
          { id: 'scans', label: 'Vulnerability Scans (Trivy)', icon: ShieldCheck },
          { id: 'audit', label: 'Compliance Audit Trail', icon: FileCheck2 },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-medium text-xs transition ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Secrets Vault */}
      {activeTab === 'secrets' && (
        <div className="space-y-4">
          {/* Environment Filter */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Environment:</span>
              {['production', 'staging', 'development'].map((env) => (
                <button
                  key={env}
                  onClick={() => setEnvFilter(env)}
                  className={`px-3 py-1 rounded-md text-xs font-medium uppercase transition ${
                    envFilter === env
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {env}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Raw secrets are never exposed in UI responses.
            </span>
          </div>

          {/* Secrets Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span>Managed Secret Variables ({secrets.length})</span>
              <span>Provider & Actions</span>
            </div>
            <div className="divide-y divide-border/60">
              {secrets.map((sec) => (
                <div key={sec.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Lock className="w-3.5 h-3.5 text-blue-400" />
                      <h4 className="font-semibold text-sm text-white">{sec.name}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-400 border border-slate-700">
                        {sec.provider === 'aws_secrets_manager' ? 'AWS Secrets Manager' : 'Local Vault'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs font-mono text-slate-400">
                      <span className="text-blue-300 font-bold">{sec.key}</span>
                      <span>=</span>
                      <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300 tracking-wider">
                        {sec.masked_value}
                      </span>
                    </div>
                    {sec.description && (
                      <p className="text-xs text-slate-400 mt-1">{sec.description}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSecretToReveal(sec);
                        setShowRevealModal(true);
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
                      title="Reveal plaintext value with audit log"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span>Reveal</span>
                    </button>
                    <button
                      onClick={() => handleDeleteSecret(sec.id, sec.key)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition"
                      title="Delete Secret"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {secrets.length === 0 && !loading && (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No secrets stored in {envFilter} environment. Click "New Secret" to securely register configuration keys.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Vulnerability Scans */}
      {activeTab === 'scans' && (
        <div className="space-y-6">
          {/* Scan Trigger Bar */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Scan Container Image
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={targetImage}
                    onChange={(e) => setTargetImage(e.target.value)}
                    placeholder="e.g. opspilot-backend:latest"
                    className="flex-1 px-3 py-2 bg-[#090d16] border border-border rounded-lg text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <button
                    disabled={actionLoading}
                    onClick={() => handleTriggerScan(targetImage)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{actionLoading ? 'Analyzing...' : 'Execute Trivy Scan'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60 text-xs text-slate-400">
              <span>Quick Presets:</span>
              {['opspilot-backend:latest', 'postgres:16-alpine', 'redis:7-alpine', 'nginx:alpine'].map((img) => (
                <button
                  key={img}
                  onClick={() => {
                    setTargetImage(img);
                    handleTriggerScan(img);
                  }}
                  className="px-2.5 py-1 rounded bg-[#090d16] border border-border text-slate-300 hover:text-white font-mono text-[11px] transition"
                >
                  {img}
                </button>
              ))}
            </div>
          </div>

          {/* Active Scan Results View */}
          {selectedScan ? (
            <div className="space-y-4">
              {/* Telemetry Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Critical CVEs</p>
                    <p className="text-2xl font-bold font-mono text-red-400 mt-1">
                      {selectedScan.critical_count}
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-500/20" />
                </div>
                <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">High CVEs</p>
                    <p className="text-2xl font-bold font-mono text-orange-400 mt-1">
                      {selectedScan.high_count}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-orange-500/20" />
                </div>
                <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Medium CVEs</p>
                    <p className="text-2xl font-bold font-mono text-amber-400 mt-1">
                      {selectedScan.medium_count}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-amber-500/20" />
                </div>
                <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Security Rating</p>
                    <p
                      className={`text-2xl font-bold font-mono mt-1 ${
                        selectedScan.critical_count > 0 ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {selectedScan.critical_count > 0 ? 'GRADE F' : 'GRADE A'}
                    </p>
                  </div>
                  <ShieldCheck className="w-8 h-8 text-blue-500/20" />
                </div>
              </div>

              {/* Findings Table */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <span>
                    Vulnerabilities in <span className="text-white font-mono">{selectedScan.image_name}</span> (
                    {selectedScan.findings.length})
                  </span>
                  <span>{new Date(selectedScan.scanned_at).toLocaleString()}</span>
                </div>
                <div className="divide-y divide-border/60">
                  {selectedScan.findings.map((vuln, idx) => {
                    const sevBadge = {
                      CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
                      HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                      MEDIUM: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                      LOW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                    };

                    return (
                      <div key={idx} className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                sevBadge[vuln.severity] || sevBadge.LOW
                              }`}
                            >
                              {vuln.severity}
                            </span>
                            <span className="font-mono font-bold text-sm text-white">
                              {vuln.vulnerability_id}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              package: <strong className="text-slate-200">{vuln.pkg_name}</strong>
                            </span>
                          </div>

                          <div className="text-xs font-mono text-slate-400">
                            <span>Installed: {vuln.installed_version}</span>
                            {vuln.fixed_version && (
                              <span className="ml-3 text-emerald-400">
                                Fix in: {vuln.fixed_version}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs font-medium text-slate-300">{vuln.title}</p>
                        {vuln.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2">{vuln.description}</p>
                        )}
                      </div>
                    );
                  })}

                  {selectedScan.findings.length === 0 && (
                    <div className="p-8 text-center text-emerald-400 text-xs">
                      Zero known vulnerabilities detected for this container image.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-card border border-border text-slate-500 text-xs">
              No scans executed yet. Click "Execute Trivy Scan" to analyze your container images.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-card border border-border">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search audit trail by actor, action, or keyword..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#090d16] border border-border rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">Non-Repudiation Audit Logs</span>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span>Event Details ({filteredAudits.length})</span>
              <span>Timestamp & IP</span>
            </div>
            <div className="divide-y divide-border/60 font-mono text-xs">
              {filteredAudits.map((a) => (
                <div key={a.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">
                        {a.action}
                      </span>
                      <span className="text-white font-semibold font-sans">{a.username || 'system'}</span>
                      <span className="text-slate-500">→</span>
                      <span className="text-slate-400">{a.resource_type}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">{a.details}</p>
                  </div>

                  <div className="text-right text-slate-500 text-[11px]">
                    <p>{new Date(a.created_at).toLocaleString()}</p>
                    <p className="text-[10px] text-slate-600">{a.ip_address || '127.0.0.1'}</p>
                  </div>
                </div>
              ))}

              {filteredAudits.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No audit log entries found matching criteria.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Secret Modal */}
      {showAddSecretModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0e1424] border border-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Lock className="w-4 h-4 text-blue-400" />
                <span>Store Secret in Vault</span>
              </h3>
              <button
                onClick={() => setShowAddSecretModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSecret} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Secret Label / Name</label>
                <input
                  type="text"
                  required
                  value={newSecretData.name}
                  onChange={(e) => setNewSecretData({ ...newSecretData, name: e.target.value })}
                  placeholder="e.g. Stripe Production API Key"
                  className="w-full px-3 py-2 bg-[#090d16] border border-border rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Key Name</label>
                  <input
                    type="text"
                    required
                    value={newSecretData.key}
                    onChange={(e) =>
                      setNewSecretData({
                        ...newSecretData,
                        key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
                      })
                    }
                    placeholder="e.g. STRIPE_API_KEY"
                    className="w-full px-3 py-2 bg-[#090d16] border border-border rounded-lg text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Environment</label>
                  <select
                    value={newSecretData.environment}
                    onChange={(e) => setNewSecretData({ ...newSecretData, environment: e.target.value })}
                    className="w-full px-3 py-2 bg-[#090d16] border border-border rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Plaintext Secret Value</label>
                <input
                  type="password"
                  required
                  value={newSecretData.value}
                  onChange={(e) => setNewSecretData({ ...newSecretData, value: e.target.value })}
                  placeholder="Paste sensitive token or key"
                  className="w-full px-3 py-2 bg-[#090d16] border border-border rounded-lg text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Vault Storage Provider</label>
                <select
                  value={newSecretData.provider}
                  onChange={(e) => setNewSecretData({ ...newSecretData, provider: e.target.value })}
                  className="w-full px-3 py-2 bg-[#090d16] border border-border rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="local">Local Encrypted Database Vault</option>
                  <option value="aws_secrets_manager">AWS Secrets Manager (Cloud)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={newSecretData.description}
                  onChange={(e) => setNewSecretData({ ...newSecretData, description: e.target.value })}
                  placeholder="Purpose of this credential"
                  className="w-full px-3 py-2 bg-[#090d16] border border-border rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowAddSecretModal(false)}
                  className="px-4 py-2 rounded-lg bg-card border border-border text-slate-300 hover:text-white text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition"
                >
                  {actionLoading ? 'Storing...' : 'Store Secret'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reveal Confirmation Modal */}
      {showRevealModal && secretToReveal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0e1424] border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-white">Compliance Audit Warning</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to decrypt and view the plaintext value of{' '}
              <strong className="text-white font-mono">{secretToReveal.key}</strong>. This administrative action will
              be permanently recorded in the immutable compliance audit trail.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={() => {
                  setShowRevealModal(false);
                  setSecretToReveal(null);
                }}
                className="px-4 py-2 rounded-lg bg-card border border-border text-slate-300 hover:text-white text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleConfirmReveal}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition"
              >
                {actionLoading ? 'Decrypting...' : 'Confirm & Reveal Plaintext'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revealed Plaintext Modal */}
      {revealedSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0e1424] border border-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-bold text-white">Decrypted Secret Value</h3>
              <button onClick={() => setRevealedSecret(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-400 font-mono mb-1">{revealedSecret.key}</p>
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-[#090d16] border border-border">
                <input
                  type="text"
                  readOnly
                  value={revealedSecret.plaintext_value}
                  className="flex-1 bg-transparent text-sm font-mono text-emerald-400 focus:outline-none"
                />
                <button
                  onClick={() => copyToClipboard(revealedSecret.plaintext_value, 'revealed')}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                  title="Copy to clipboard"
                >
                  {copiedId === 'revealed' ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Audit recorded: Revealed by {revealedSecret.revealed_by} at{' '}
              {new Date(revealedSecret.revealed_at).toLocaleTimeString()}.
            </p>

            <button
              onClick={() => setRevealedSecret(null)}
              className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
