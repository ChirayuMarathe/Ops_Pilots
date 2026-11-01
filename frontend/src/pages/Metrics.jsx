import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  BarChart2,
  Activity,
  Cpu,
  HardDrive,
  Zap,
  AlertTriangle,
  Clock,
  Play,
  RotateCw,
  Search,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const Metrics = () => {
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [queryInput, setQueryInput] = useState('rate(http_requests_total[5m])');
  const [queryResult, setQueryResult] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [queryError, setQueryError] = useState('');

  const fetchOverview = async () => {
    try {
      setLoadingOverview(true);
      const res = await api.get('/monitoring/overview');
      setOverview(res.data);
    } catch (err) {
      console.error('Failed to load metrics overview:', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  const handleExecuteQuery = async (queryToRun) => {
    const q = queryToRun || queryInput;
    if (!q) return;
    setExecuting(true);
    setQueryError('');
    try {
      const res = await api.post('/monitoring/query', { query: q });
      setQueryResult(res.data);
    } catch (err) {
      setQueryError(err.response?.data?.detail || 'Failed to execute PromQL query.');
      setQueryResult(null);
    } finally {
      setExecuting(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    handleExecuteQuery('rate(http_requests_total[5m])');
  }, []);

  const presets = [
    { name: 'HTTP Request Rate', query: 'rate(http_requests_total[5m])' },
    { name: '5xx Error Rate', query: '(sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))) * 100' },
    { name: 'CPU Usage %', query: '100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)' },
    { name: 'Memory Usage %', query: '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100' },
    { name: 'p95 Response Latency', query: 'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) * 1000' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <BarChart2 className="w-6 h-6 text-blue-400" />
            <span>Prometheus Metrics & SRE Telemetry</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Google SRE Golden Signals, latency percentiles, and real-time PromQL query engine
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono">
            {overview?.is_prometheus_online ? (
              <span className="flex items-center space-x-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>PROMETHEUS ONLINE</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span>STANDBY</span>
              </span>
            )}
          </div>
          <button
            onClick={fetchOverview}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Refresh Metrics"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SRE 4 Golden Signals Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Signal 1: CPU */}
        <div className="p-4 rounded-xl bg-[#0e1424] border border-border/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>CPU Saturation</span>
            <Cpu className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {overview?.cpu_usage_percent ?? 0}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Avg 5m cluster load</p>
        </div>

        {/* Signal 2: Memory */}
        <div className="p-4 rounded-xl bg-[#0e1424] border border-border/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Memory Saturation</span>
            <HardDrive className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {overview?.memory_usage_percent ?? 0}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">RAM committed</p>
        </div>

        {/* Signal 3: Traffic */}
        <div className="p-4 rounded-xl bg-[#0e1424] border border-border/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Traffic (RPS)</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {overview?.request_rate_rps ?? 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Requests per sec</p>
        </div>

        {/* Signal 4: Errors */}
        <div className="p-4 rounded-xl bg-[#0e1424] border border-border/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Error Rate (5xx)</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {overview?.error_rate_percent ?? 0}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">HTTP 5xx responses</p>
        </div>

        {/* Signal 5: Latency */}
        <div className="p-4 rounded-xl bg-[#0e1424] border border-border/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>p95 Latency</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {overview?.p95_latency_ms ?? 0} ms
          </div>
          <p className="text-[11px] text-slate-400 mt-1">95th percentile response</p>
        </div>
      </div>

      {/* PromQL Query Console */}
      <div className="p-6 rounded-2xl bg-[#0e1424] border border-border/80 space-y-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span>Interactive PromQL Query Console</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">Direct Prometheus v1 API</span>
        </div>

        {/* Preset Query Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">Presets:</span>
          {presets.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                setQueryInput(p.query);
                handleExecuteQuery(p.query);
              }}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-blue-500 hover:text-blue-300 text-slate-300 font-mono transition"
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Query Input Bar */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 font-mono text-xs">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="e.g. rate(http_requests_total[5m])"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
            />
          </div>
          <button
            onClick={() => handleExecuteQuery()}
            disabled={executing || !queryInput}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition shadow-md shadow-blue-600/20 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{executing ? 'Executing...' : 'Execute'}</span>
          </button>
        </div>

        {queryError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <span>{queryError}</span>
          </div>
        )}

        {/* Results Viewer */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Query Vector Results ({queryResult?.series?.length || 0} series)
          </div>

          <div className="rounded-xl border border-border/80 bg-slate-950/80 p-4 font-mono text-xs max-h-80 overflow-y-auto">
            {executing ? (
              <div className="text-slate-500 py-4 text-center">Evaluating PromQL query...</div>
            ) : queryResult?.series?.length > 0 ? (
              <div className="divide-y divide-slate-800/60">
                {queryResult.series.map((s, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div className="space-x-1.5 text-slate-300">
                      <span className="text-blue-400 font-bold">{queryResult.query}</span>
                      <span className="text-slate-500">
                        {JSON.stringify(s.labels)}
                      </span>
                    </div>
                    <div className="text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      {s.values[0]?.value ?? 0}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-500 py-4 text-center">
                {overview?.is_prometheus_online
                  ? 'No vector series returned for this query.'
                  : 'Prometheus endpoint reachable. Standby telemetry active.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

