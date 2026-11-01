import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  LineChart,
  ExternalLink,
  Layers,
  Server,
  Activity,
  CheckCircle2,
  AlertCircle,
  FileText,
  Shield,
  Zap,
} from 'lucide-react';

export const Dashboards = () => {
  const [grafanaConfig, setGrafanaConfig] = useState(null);
  const [obsStatus, setObsStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [grafRes, statusRes] = await Promise.all([
        api.get('/monitoring/grafana'),
        api.get('/monitoring/status'),
      ]);
      setGrafanaConfig(grafRes.data);
      setObsStatus(statusRes.data);
    } catch (err) {
      console.error('Failed to load Grafana configuration:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const dashboards = [
    {
      name: 'Kubernetes Cluster Telemetry',
      uid: 'k8s-cluster',
      desc: 'Node CPU/RAM saturation, pod capacity, network throughput and PVC storage utilization.',
      icon: Layers,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
    {
      name: 'Linux Node Exporter Metrics',
      uid: 'node-exporter',
      desc: 'Deep OS-level kernel telemetry, load averages, context switches, disk I/O and filesystem alerts.',
      icon: Server,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
    {
      name: 'Microservices SRE Golden Signals',
      uid: 'microservices-sre',
      desc: 'Google SRE 4 Golden Signals: latency percentiles (p50, p95, p99), traffic rates, and HTTP 5xx errors.',
      icon: Activity,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      name: 'Loki Centralized Workload Logs',
      uid: 'loki-logs',
      desc: 'High-speed log streaming, LogQL rate calculations, and correlated deployment failure investigation.',
      icon: FileText,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <LineChart className="w-6 h-6 text-blue-400" />
            <span>Grafana Observability Dashboards</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Production telemetry visualization, cluster metrics and centralized log aggregation
          </p>
        </div>

        {grafanaConfig?.url && (
          <a
            href={grafanaConfig.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition shadow-lg shadow-blue-600/20 self-start sm:self-auto"
          >
            <span>Launch Grafana Console</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Datasource Verification Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#0e1424] border border-border/80 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Prometheus Store</div>
            <div className="text-sm font-bold text-white mt-1 font-mono">{obsStatus?.prometheus?.url || 'http://localhost:9090'}</div>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ACTIVE
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1424] border border-border/80 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Loki Log Daemon</div>
            <div className="text-sm font-bold text-white mt-1 font-mono">{obsStatus?.loki?.url || 'http://localhost:3100'}</div>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ACTIVE
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1424] border border-border/80 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Grafana Instance</div>
            <div className="text-sm font-bold text-white mt-1 font-mono">{obsStatus?.grafana?.url || 'http://localhost:3001'}</div>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            CONNECTED
          </span>
        </div>
      </div>

      {/* Dashboards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {dashboards.map((dash) => {
          const Icon = dash.icon;
          const directUrl = `${grafanaConfig?.url || 'http://localhost:3001'}/d/${dash.uid}`;
          return (
            <div
              key={dash.uid}
              className="p-6 rounded-2xl bg-[#0e1424] border border-border/80 hover:border-slate-700 transition flex flex-col justify-between space-y-4 shadow-xl"
            >
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-xl border ${dash.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{dash.name}</h3>
                    <span className="text-xs font-mono text-slate-500">uid: {dash.uid}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{dash.desc}</p>
              </div>

              <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">Auto-refreshed (5s)</span>
                <a
                  href={directUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
                >
                  <span>Open Dashboard</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
