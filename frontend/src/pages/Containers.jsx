import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Box,
  Server,
  Play,
  Square,
  RotateCw,
  Terminal,
  Activity,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Cpu,
  HardDrive,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';

export const Containers = () => {
  const [activeTab, setActiveTab] = useState('containers'); // 'containers' | 'images'
  const [status, setStatus] = useState(null);
  const [containers, setContainers] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Logs modal
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [activeContainer, setActiveContainer] = useState(null);
  const [logs, setLogs] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Inspect modal
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [inspectData, setInspectData] = useState(null);
  const [containerStats, setContainerStats] = useState(null);
  const [loadingInspect, setLoadingInspect] = useState(false);

  // Action loading state
  const [actionLoading, setActionLoading] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusRes, contRes, imgRes] = await Promise.all([
        api.get('/docker/status'),
        api.get('/docker/containers?all=true'),
        api.get('/docker/images'),
      ]);
      setStatus(statusRes.data);
      setContainers(contRes.data);
      setImages(imgRes.data);
    } catch (err) {
      console.error('Failed to load Docker environment telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (containerId, action) => {
    try {
      setActionLoading(`${containerId}-${action}`);
      await api.post(`/docker/containers/${containerId}/action`, { action });
      await fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || `Failed to execute ${action} on container.`);
    } finally {
      setActionLoading(null);
    }
  };

  const openLogs = async (container) => {
    setActiveContainer(container);
    setShowLogsModal(true);
    setLoadingLogs(true);
    try {
      const res = await api.get(`/docker/containers/${container.id}/logs?tail=200`);
      setLogs(res.data.logs || 'No log output emitted.');
    } catch (err) {
      setLogs(`Failed to fetch logs: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoadingLogs(false);
    }
  };

  const openInspect = async (container) => {
    setActiveContainer(container);
    setShowInspectModal(true);
    setLoadingInspect(true);
    try {
      const [inspectRes, statsRes] = await Promise.all([
        api.get(`/docker/containers/${container.id}`),
        api.get(`/docker/containers/${container.id}/stats`).catch(() => null),
      ]);
      setInspectData(inspectRes.data);
      setContainerStats(statsRes?.data || null);
    } catch (err) {
      console.error('Failed to inspect container:', err);
    } finally {
      setLoadingInspect(false);
    }
  };

  const filteredContainers = containers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.image_tag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredImages = images.filter(
    (img) =>
      img.repository.toLowerCase().includes(searchTerm.toLowerCase()) ||
      img.tag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Box className="w-6 h-6 text-blue-400" />
            <span>Docker Engine Runtime</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Local container management, resource consumption and container log inspection
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 transition text-sm self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Sync Engine</span>
        </button>
      </div>

      {/* Engine Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0e1424] border border-border/80">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Engine Daemon</span>
          <div className="mt-2 flex items-center space-x-2">
            {status?.is_available ? (
              <span className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ONLINE (v{status.server_version})</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>OFFLINE</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">{status?.operating_system || 'Local OS Runtime'}</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1424] border border-border/80">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Running Workloads</span>
          <div className="text-2xl font-bold text-white mt-1">{status?.containers_running ?? 0}</div>
          <p className="text-[11px] text-slate-400 mt-1">Active container instances</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1424] border border-border/80">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stopped Containers</span>
          <div className="text-2xl font-bold text-slate-400 mt-1">{status?.containers_stopped ?? 0}</div>
          <p className="text-[11px] text-slate-400 mt-1">Exited / terminated</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1424] border border-border/80">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Local Images</span>
          <div className="text-2xl font-bold text-cyan-400 mt-1">{status?.images_total ?? images.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Available in local registry</p>
        </div>
      </div>

      {/* Navigation Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('containers')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'containers'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Containers ({containers.length})
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'images'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Container Images ({images.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'containers' ? 'Filter containers...' : 'Filter images...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-[#0e1424] border border-border/80 text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Containers Tab View */}
      {activeTab === 'containers' && (
        <div className="overflow-x-auto rounded-xl border border-border/80 bg-[#0e1424]">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Container</th>
                <th className="py-3.5 px-4">Image Tag</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Restarts</th>
                <th className="py-3.5 px-4">Ports</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-mono text-xs">
                    Querying Docker daemon...
                  </td>
                </tr>
              ) : filteredContainers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                    No containers found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredContainers.map((c) => {
                  const isRunning = c.status === 'running';
                  return (
                    <tr key={c.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{c.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{c.short_id}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                        {c.image_tag}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${
                            isRunning
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                          <span className="capitalize">{c.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <span className={c.restart_count > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                          {c.restart_count}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                        {Object.keys(c.ports).length > 0 ? Object.keys(c.ports).join(', ') : 'None'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openLogs(c)}
                            title="View Logs"
                            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition"
                          >
                            <Terminal className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openInspect(c)}
                            title="Inspect & Metrics"
                            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition"
                          >
                            <Activity className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAction(c.id, isRunning ? 'restart' : 'start')}
                            disabled={actionLoading === `${c.id}-${isRunning ? 'restart' : 'start'}`}
                            title={isRunning ? 'Restart' : 'Start'}
                            className="p-1.5 rounded-md hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 transition"
                          >
                            <RotateCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                          </button>
                          {isRunning && (
                            <button
                              onClick={() => handleAction(c.id, 'stop')}
                              disabled={actionLoading === `${c.id}-stop`}
                              title="Stop Container"
                              className="p-1.5 rounded-md hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition"
                            >
                              <Square className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Images Tab View */}
      {activeTab === 'images' && (
        <div className="overflow-x-auto rounded-xl border border-border/80 bg-[#0e1424]">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Repository</th>
                <th className="py-3.5 px-4">Tag</th>
                <th className="py-3.5 px-4">Image ID</th>
                <th className="py-3.5 px-4">Size</th>
                <th className="py-3.5 px-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredImages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                    No images found.
                  </td>
                </tr>
              ) : (
                filteredImages.map((img) => (
                  <tr key={img.id + img.tag} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4 font-semibold text-white">{img.repository}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-blue-400">{img.tag}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">{img.short_id}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300">{img.size_mb} MB</td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {img.created_at ? new Date(img.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Live Logs Modal */}
      {showLogsModal && activeContainer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e1424] border border-border/80 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-border/80 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Terminal className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">
                  Logs: <span className="font-mono text-blue-400">{activeContainer.name}</span>
                </h3>
              </div>
              <button
                onClick={() => setShowLogsModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto bg-black font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-all">
              {loadingLogs ? 'Streaming logs...' : logs}
            </div>

            <div className="p-3 border-t border-border/80 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
              <span>Showing last 200 log lines with timestamps</span>
              <button
                onClick={() => openLogs(activeContainer)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect & Metrics Modal */}
      {showInspectModal && activeContainer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e1424] border border-border/80 w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative max-h-[85vh] overflow-y-auto space-y-5">
            <button
              onClick={() => setShowInspectModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <span>Telemetry: {activeContainer.name}</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{activeContainer.id}</p>
            </div>

            {loadingInspect ? (
              <div className="py-8 text-center text-slate-400 font-mono text-xs">Querying container stats...</div>
            ) : (
              <div className="space-y-4">
                {/* Real-time resource metrics */}
                {containerStats && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase">
                        <Cpu className="w-4 h-4 text-blue-400" />
                        <span>CPU Utilization</span>
                      </div>
                      <div className="text-2xl font-bold text-white mt-1">
                        {containerStats.cpu_percent}%
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase">
                        <HardDrive className="w-4 h-4 text-purple-400" />
                        <span>RAM Utilization</span>
                      </div>
                      <div className="text-2xl font-bold text-white mt-1">
                        {containerStats.memory_usage_mb} MB{' '}
                        <span className="text-xs font-normal text-slate-400">({containerStats.memory_percent}%)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Inspect Details */}
                {inspectData && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 font-mono">
                      <div>Status: <span className="text-emerald-400">{inspectData.status}</span></div>
                      <div>IP Address: <span className="text-slate-200">{inspectData.ip_address || 'Host / None'}</span></div>
                      <div>Restart Count: <span className="text-slate-200">{inspectData.restart_count}</span></div>
                      <div>Command: <span className="text-slate-300">{inspectData.command || 'N/A'}</span></div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-300 mb-1.5 uppercase text-[11px] tracking-wider">
                        Environment Variables (Safely Masked)
                      </h4>
                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 max-h-36 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1">
                        {inspectData.env_vars.map((env, i) => (
                          <div key={i}>{env}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

