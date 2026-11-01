import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Terminal,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Copy,
  Check,
} from 'lucide-react';

export const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('{app=~".+"}');
  const [loading, setLoading] = useState(true);
  const [lokiStatus, setLokiStatus] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fetchStatusAndServices = async () => {
    try {
      const [statusRes, svcsRes] = await Promise.all([
        api.get('/logs/status'),
        api.get('/logs/services'),
      ]);
      setLokiStatus(statusRes.data);
      setServices(svcsRes.data);
    } catch (err) {
      console.error('Failed to load Loki status:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('query', searchQuery);
      params.append('limit', '150');
      if (selectedSeverity !== 'ALL') {
        params.append('severity', selectedSeverity);
      }
      if (selectedService !== 'all') {
        params.append('service', selectedService);
      }

      const res = await api.get(`/logs/query?${params.toString()}`);
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndServices();
    fetchLogs();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const copyLogLine = (log) => {
    navigator.clipboard.writeText(`${log.timestamp} [${log.severity}] [${log.service}] ${log.message}`);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'ERROR':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'WARNING':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'DEBUG':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      default:
        return 'text-slate-300 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <FileText className="w-6 h-6 text-blue-400" />
            <span>Centralized Loki Log Explorer</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time LogQL stream queries, microservice log aggregation and failure diagnostics
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono">
            {lokiStatus?.is_connected ? (
              <span className="flex items-center space-x-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>LOKI STREAMING</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span>STANDBY / READY</span>
              </span>
            )}
          </div>
          <button
            onClick={fetchLogs}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Refresh Logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Query Bar and Filters */}
      <div className="p-5 rounded-2xl bg-[#0e1424] border border-border/80 space-y-4 shadow-xl">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='LogQL query, e.g. {app=~".+"} |= "ERROR"'
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition shadow-md shadow-blue-600/20"
          >
            <span>Run Query</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60 text-xs">
          {/* Service Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium">Service:</span>
            <select
              value={selectedService}
              onChange={(e) => {
                setSelectedService(e.target.value);
                setTimeout(fetchLogs, 50);
              }}
              className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none"
            >
              <option value="all">All Services</option>
              {services.map((svc) => (
                <option key={svc} value={svc}>
                  {svc}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Buttons */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 font-medium mr-1">Severity:</span>
            {['ALL', 'ERROR', 'WARNING', 'INFO', 'DEBUG'].map((sev) => (
              <button
                key={sev}
                onClick={() => {
                  setSelectedSeverity(sev);
                  setTimeout(fetchLogs, 50);
                }}
                className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-semibold transition ${
                  selectedSeverity === sev
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/40'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Terminal Logs Viewer */}
      <div className="rounded-2xl border border-border/80 bg-black shadow-2xl overflow-hidden flex flex-col min-h-[500px]">
        <div className="px-4 py-3 bg-[#0d121f] border-b border-border/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-slate-400 font-mono">
            <Terminal className="w-4 h-4 text-blue-400" />
            <span>Loki Log Stream ({logs.length} entries)</span>
          </div>
          <span className="text-slate-500 font-mono text-[11px]">LogQL syntax enabled</span>
        </div>

        <div className="p-4 flex-1 overflow-y-auto font-mono text-xs leading-relaxed divide-y divide-slate-900/60 select-text">
          {loading ? (
            <div className="py-16 text-center text-slate-500">Executing LogQL query stream...</div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              No matching log events returned.
            </div>
          ) : (
            logs.map((item, idx) => (
              <div
                key={item.id || idx}
                className="py-1.5 px-2 hover:bg-slate-900/60 rounded flex items-start space-x-3 transition group"
              >
                <span className="text-slate-600 select-none w-8 text-right flex-shrink-0 text-[11px]">
                  {idx + 1}
                </span>

                <span className="text-slate-500 flex-shrink-0 text-[11px]">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour12: false })}
                </span>

                <span
                  className={`px-1.5 py-0.2 rounded border text-[10px] font-bold flex-shrink-0 uppercase ${getSeverityBadge(
                    item.severity
                  )}`}
                >
                  {item.severity}
                </span>

                <span className="text-cyan-400 flex-shrink-0 font-semibold text-[11px]">
                  [{item.service}]
                </span>

                <span className="text-slate-200 flex-1 break-all">{item.message}</span>

                <button
                  onClick={() => copyLogLine(item)}
                  title="Copy log entry"
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-white transition flex-shrink-0"
                >
                  {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

