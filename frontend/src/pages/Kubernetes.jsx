import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Layers,
  Server,
  Box,
  RotateCw,
  Sliders,
  Terminal,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  Search,
  RefreshCw,
  Cpu,
  HardDrive,
  Globe,
  Bell,
} from 'lucide-react';

export const Kubernetes = () => {
  const [activeTab, setActiveTab] = useState('deployments'); // 'deployments' | 'pods' | 'services' | 'events' | 'nodes'
  const [clusterInfo, setClusterInfo] = useState(null);
  const [namespaces, setNamespaces] = useState([]);
  const [selectedNamespace, setSelectedNamespace] = useState('all');
  const [deployments, setDeployments] = useState([]);
  const [pods, setPods] = useState([]);
  const [services, setServices] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Scale modal
  const [showScaleModal, setShowScaleModal] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [targetReplicas, setTargetReplicas] = useState(1);
  const [scaling, setScaling] = useState(false);

  // Pod logs modal
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedPod, setSelectedPod] = useState(null);
  const [podLogs, setPodLogs] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Action loading
  const [restarting, setRestarting] = useState(null);

  const fetchClusterOverview = async () => {
    try {
      setLoading(true);
      const [clusterRes, nsRes] = await Promise.all([
        api.get('/kubernetes/cluster'),
        api.get('/kubernetes/namespaces'),
      ]);
      setClusterInfo(clusterRes.data);
      setNamespaces(nsRes.data);
    } catch (err) {
      console.error('Failed to load cluster metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkloads = async () => {
    try {
      const nsParam = selectedNamespace === 'all' ? 'all' : selectedNamespace;
      const [depsRes, podsRes, svcsRes, evtsRes] = await Promise.all([
        api.get(`/kubernetes/deployments?namespace=${nsParam}`),
        api.get(`/kubernetes/pods?namespace=${nsParam}`),
        api.get(`/kubernetes/services?namespace=${nsParam}`),
        api.get(`/kubernetes/events?namespace=${nsParam}`),
      ]);
      setDeployments(depsRes.data);
      setPods(podsRes.data);
      setServices(svcsRes.data);
      setEvents(evtsRes.data);
    } catch (err) {
      console.error('Failed to query workloads:', err);
    }
  };

  useEffect(() => {
    fetchClusterOverview();
  }, []);

  useEffect(() => {
    fetchWorkloads();
  }, [selectedNamespace]);

  const handleScale = async (e) => {
    e.preventDefault();
    if (!selectedDeployment) return;
    setScaling(true);
    try {
      await api.post(
        `/kubernetes/deployments/${selectedDeployment.namespace}/${selectedDeployment.name}/scale`,
        { replicas: targetReplicas }
      );
      setShowScaleModal(false);
      fetchWorkloads();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to scale deployment replicas.');
    } finally {
      setScaling(false);
    }
  };

  const handleRestart = async (dep) => {
    if (!window.confirm(`Initiate rolling restart for deployment '${dep.name}'?`)) return;
    setRestarting(dep.name);
    try {
      await api.post(`/kubernetes/deployments/${dep.namespace}/${dep.name}/restart`);
      await fetchWorkloads();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to trigger rolling restart.');
    } finally {
      setRestarting(null);
    }
  };

  const openLogs = async (pod) => {
    setSelectedPod(pod);
    setShowLogsModal(true);
    setLoadingLogs(true);
    try {
      const res = await api.get(
        `/kubernetes/pods/${pod.namespace}/${pod.name}/logs?tail_lines=150`
      );
      setPodLogs(res.data.logs || 'No log output emitted.');
    } catch (err) {
      setPodLogs(`Failed to fetch pod logs: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoadingLogs(false);
    }
  };

  const filteredDeployments = deployments.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.namespace.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPods = pods.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.namespace.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.namespace.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEvents = events.filter(
    (ev) =>
      ev.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.involved_object.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Layers className="w-6 h-6 text-blue-400" />
            <span>Kubernetes Cluster & Workload Console</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Cluster topology, pod telemetry, replica scaling and rolling rollout orchestration
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto">
          {/* Namespace Filter */}
          <select
            value={selectedNamespace}
            onChange={(e) => setSelectedNamespace(e.target.value)}
            className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Namespaces</option>
            {namespaces.map((ns) => (
              <option key={ns.name} value={ns.name}>
                ns/{ns.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              fetchClusterOverview();
              fetchWorkloads();
            }}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Cluster Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0e1424] border border-border/80">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cluster Context</span>
          <div className="text-base font-bold text-white mt-1 truncate">
            {clusterInfo?.cluster_name || 'local-cluster'}
          </div>
          <div className="mt-2 flex items-center space-x-1.5">
            {clusterInfo?.is_connected ? (
              <span className="flex items-center space-x-1 text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                <span>ONLINE ({clusterInfo.server_version})</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                <span>STANDBY / OFFLINE</span>
              </span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1424] border border-border/80">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cluster Nodes</span>
          <div className="text-2xl font-bold text-white mt-1">{clusterInfo?.node_count ?? 0}</div>
          <p className="text-[11px] text-slate-400 mt-1">Control plane & worker nodes</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1424] border border-border/80">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Deployments</span>
          <div className="text-2xl font-bold text-cyan-400 mt-1">{deployments.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Managed workload controllers</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1424] border border-border/80">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Pods</span>
          <div className="text-2xl font-bold text-purple-400 mt-1">{pods.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Running application instances</p>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center space-x-2 overflow-x-auto">
          {[
            { id: 'deployments', label: `Deployments (${deployments.length})` },
            { id: 'pods', label: `Pods (${pods.length})` },
            { id: 'services', label: `Services (${services.length})` },
            { id: 'events', label: `Events (${events.length})` },
            { id: 'nodes', label: `Nodes (${clusterInfo?.nodes?.length || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 rounded-lg bg-[#0e1424] border border-border/80 text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Deployments Tab */}
      {activeTab === 'deployments' && (
        <div className="overflow-x-auto rounded-xl border border-border/80 bg-[#0e1424]">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Deployment</th>
                <th className="py-3.5 px-4">Namespace</th>
                <th className="py-3.5 px-4">Replicas</th>
                <th className="py-3.5 px-4">Container Image</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredDeployments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                    {clusterInfo?.is_connected ? 'No deployments found in selected namespace.' : 'Kubernetes cluster is in standby or offline.'}
                  </td>
                </tr>
              ) : (
                filteredDeployments.map((d) => (
                  <tr key={d.namespace + d.name} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4 font-semibold text-white">{d.name}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">{d.namespace}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {d.ready_replicas} / {d.replicas}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300 truncate max-w-xs">
                      {d.images[0] || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedDeployment(d);
                            setTargetReplicas(d.replicas);
                            setShowScaleModal(true);
                          }}
                          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Scale</span>
                        </button>

                        <button
                          onClick={() => handleRestart(d)}
                          disabled={restarting === d.name}
                          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-xs font-medium transition"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${restarting === d.name ? 'animate-spin' : ''}`} />
                          <span>Restart</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pods Tab */}
      {activeTab === 'pods' && (
        <div className="overflow-x-auto rounded-xl border border-border/80 bg-[#0e1424]">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Pod Name</th>
                <th className="py-3.5 px-4">Namespace</th>
                <th className="py-3.5 px-4">Ready</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Restarts</th>
                <th className="py-3.5 px-4">Node</th>
                <th className="py-3.5 px-4 text-right">Logs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredPods.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                    No active pods found.
                  </td>
                </tr>
              ) : (
                filteredPods.map((p) => {
                  const isRunning = p.phase === 'Running';
                  return (
                    <tr key={p.namespace + p.name} className="hover:bg-slate-900/40 transition">
                      <td className="py-3.5 px-4 font-mono text-xs font-medium text-white">{p.name}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400">{p.namespace}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300">{p.ready_containers}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                            isRunning
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                          <span>{p.phase}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <span className={p.restarts > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                          {p.restarts}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400">{p.node || 'N/A'}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openLogs(p)}
                          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition"
                          title="Stream Pod Logs"
                        >
                          <Terminal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="overflow-x-auto rounded-xl border border-border/80 bg-[#0e1424]">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Service</th>
                <th className="py-3.5 px-4">Namespace</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Cluster IP</th>
                <th className="py-3.5 px-4">Ports</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                    No services discovered.
                  </td>
                </tr>
              ) : (
                filteredServices.map((s) => (
                  <tr key={s.namespace + s.name} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4 font-semibold text-white">{s.name}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">{s.namespace}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-blue-400">{s.service_type}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300">{s.cluster_ip || 'None'}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">{s.ports.join(', ') || 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="overflow-x-auto rounded-xl border border-border/80 bg-[#0e1424]">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Reason</th>
                <th className="py-3.5 px-4">Involved Object</th>
                <th className="py-3.5 px-4">Message</th>
                <th className="py-3.5 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                    No recent cluster events logged.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40 transition text-xs">
                    <td className="py-3 px-4">
                      <span
                        className={`font-mono px-2 py-0.5 rounded font-bold ${
                          ev.event_type === 'Warning'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {ev.event_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">{ev.reason}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{ev.involved_object}</td>
                    <td className="py-3 px-4 text-slate-400 max-w-md truncate">{ev.message}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Nodes Tab */}
      {activeTab === 'nodes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clusterInfo?.nodes?.map((node) => (
            <div key={node.name} className="p-5 rounded-xl bg-[#0e1424] border border-border/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-white text-base">{node.name}</div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    node.status === 'Ready'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {node.status}
                </span>
              </div>
              <div className="text-xs text-slate-400 space-y-1 font-mono">
                <div>Roles: <span className="text-slate-200">{node.roles.join(', ')}</span></div>
                <div>Kubernetes Version: <span className="text-slate-200">{node.version}</span></div>
                <div>Operating System: <span className="text-slate-200">{node.os_image}</span></div>
                <div>CPU Capacity: <span className="text-blue-400">{node.cpu_capacity} cores</span></div>
                <div>Memory Capacity: <span className="text-purple-400">{node.memory_capacity}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scale Replicas Modal */}
      {showScaleModal && selectedDeployment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e1424] border border-border/80 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowScaleModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1">Scale Deployment</h2>
            <p className="text-xs text-slate-400 mb-6">
              Adjust pod replicas for <span className="text-slate-200 font-semibold">{selectedDeployment.name}</span> in ns/{selectedDeployment.namespace}.
            </p>

            <form onSubmit={handleScale} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Target Replicas ({targetReplicas})
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={targetReplicas}
                  onChange={(e) => setTargetReplicas(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1">
                  <span>0 (Suspended)</span>
                  <span>5</span>
                  <span>10 (Max)</span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowScaleModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scaling}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition disabled:opacity-50"
                >
                  {scaling ? 'Updating...' : `Set Replicas to ${targetReplicas}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pod Logs Modal */}
      {showLogsModal && selectedPod && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e1424] border border-border/80 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-border/80 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Terminal className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">
                  Pod Logs: <span className="font-mono text-blue-400">{selectedPod.name}</span>
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
              {loadingLogs ? 'Streaming pod logs...' : podLogs}
            </div>

            <div className="p-3 border-t border-border/80 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
              <span>Namespace: {selectedPod.namespace} • Tail: 150 lines</span>
              <button
                onClick={() => openLogs(selectedPod)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
