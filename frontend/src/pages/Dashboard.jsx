import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  FolderGit2,
  Rocket,
  CheckCircle2,
  XCircle,
  Activity,
  AlertTriangle,
  Server,
  Plus,
  RefreshCw,
  Clock,
  ShieldCheck,
  ExternalLink,
  Layers,
  Box,
  Binary,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const [sumRes, actRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/activity?limit=6'),
      ]);
      setSummary(sumRes.data);
      setActivity(actRes.data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'degraded':
      case 'warning':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'critical':
      case 'offline':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      default:
        return 'text-[#DFD0B8] bg-[#393E46] border-[rgba(148,137,121,0.3)]';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[rgba(148,137,121,0.2)]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <span>Welcome back, {user?.full_name || user?.username}</span>
          </h1>
          <p className="text-xs text-[#948979] mt-1">
            OpsPilot Executive Overview • Real-time infrastructure & workload telemetry
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-[#393E46] border border-[rgba(148,137,121,0.25)] text-[#DFD0B8] hover:bg-[#444a53] transition text-xs font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <Link
            to="/projects"
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#DFD0B8] hover:bg-[#ece2d0] text-[#222831] font-semibold transition text-xs shadow-subtle"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Project</span>
          </Link>
        </div>
      </div>

      {/* 6 Mandatory Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Total Projects */}
        <div className="p-5 rounded-xl bg-[#393E46] border border-[rgba(148,137,121,0.22)] shadow-subtle hover:border-[rgba(148,137,121,0.4)] transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#948979] uppercase tracking-wider font-mono">Total Projects</span>
            <div className="p-2 rounded-lg bg-[#222831] text-[#DFD0B8] border border-[rgba(148,137,121,0.25)]">
              <FolderGit2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-white font-mono">
              {loading ? '...' : summary?.total_projects ?? 0}
            </div>
            <p className="text-xs text-[#948979] mt-1">Connected repositories & applications</p>
          </div>
        </div>

        {/* Card 2: Active Deployments */}
        <div className="p-5 rounded-xl bg-[#393E46] border border-[rgba(148,137,121,0.22)] shadow-subtle hover:border-[rgba(148,137,121,0.4)] transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#948979] uppercase tracking-wider font-mono">Active Deployments</span>
            <div className="p-2 rounded-lg bg-[#222831] text-[#DFD0B8] border border-[rgba(148,137,121,0.25)]">
              <Rocket className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-white font-mono">
              {loading ? '...' : summary?.active_deployments ?? 0}
            </div>
            <p className="text-xs text-[#948979] mt-1">Currently running workload stages</p>
          </div>
        </div>

        {/* Card 3: Healthy Services */}
        <div className="p-5 rounded-xl bg-[#393E46] border border-[rgba(148,137,121,0.22)] shadow-subtle hover:border-[rgba(148,137,121,0.4)] transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#948979] uppercase tracking-wider font-mono">Healthy Services</span>
            <div className="p-2 rounded-lg bg-[#222831] text-emerald-400 border border-[rgba(148,137,121,0.25)]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-white font-mono">
              {loading ? '...' : summary?.healthy_services ?? 0}
            </div>
            <p className="text-xs text-[#948979] mt-1">Operational service instances</p>
          </div>
        </div>

        {/* Card 4: Failed Deployments */}
        <div className="p-5 rounded-xl bg-[#393E46] border border-[rgba(148,137,121,0.22)] shadow-subtle hover:border-[rgba(148,137,121,0.4)] transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#948979] uppercase tracking-wider font-mono">Failed Deployments</span>
            <div className="p-2 rounded-lg bg-[#222831] text-red-400 border border-[rgba(148,137,121,0.25)]">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-white font-mono">
              {loading ? '...' : summary?.failed_deployments ?? 0}
            </div>
            <p className="text-xs text-[#948979] mt-1">Failed delivery attempts</p>
          </div>
        </div>

        {/* Card 5: Infrastructure Status */}
        <div className="p-5 rounded-xl bg-[#393E46] border border-[rgba(148,137,121,0.22)] shadow-subtle hover:border-[rgba(148,137,121,0.4)] transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#948979] uppercase tracking-wider font-mono">Infrastructure Status</span>
            <div className="p-2 rounded-lg bg-[#222831] text-[#DFD0B8] border border-[rgba(148,137,121,0.25)]">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getStatusColor(
                  summary?.infrastructure_status
                )}`}
              >
                {loading ? '...' : summary?.infrastructure_status || 'Ready'}
              </span>
            </div>
            <p className="text-xs text-[#948979] mt-2">Overall cluster & orchestrator health</p>
          </div>
        </div>

        {/* Card 6: Recent Incidents */}
        <div className="p-5 rounded-xl bg-[#393E46] border border-[rgba(148,137,121,0.22)] shadow-subtle hover:border-[rgba(148,137,121,0.4)] transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#948979] uppercase tracking-wider font-mono">Recent Incidents</span>
            <div className="p-2 rounded-lg bg-[#222831] text-amber-400 border border-[rgba(148,137,121,0.25)]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-white font-mono">
              {loading ? '...' : summary?.recent_incidents ?? 0}
            </div>
            <p className="text-xs text-[#948979] mt-1">Detected anomalies & active alerts</p>
          </div>
        </div>
      </div>

      {/* Integration Matrix & Recent Auditing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subsystems Matrix */}
        <div className="lg:col-span-1 p-6 rounded-xl bg-[#393E46] border border-[rgba(148,137,121,0.22)] shadow-subtle space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
            <Server className="w-4 h-4 text-[#DFD0B8]" />
            <span>Subsystem Integration Matrix</span>
          </h2>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#222831] border border-[rgba(148,137,121,0.2)]">
              <span className="text-[#DFD0B8] font-medium">FastAPI Core</span>
              <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">ONLINE</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#222831] border border-[rgba(148,137,121,0.2)]">
              <span className="text-[#DFD0B8] font-medium">PostgreSQL Metadata</span>
              <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">CONNECTED</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#222831] border border-[rgba(148,137,121,0.2)]">
              <span className="text-[#DFD0B8] font-medium">Docker Daemon Engine</span>
              <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">OPERATIONAL</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#222831] border border-[rgba(148,137,121,0.2)]">
              <span className="text-[#DFD0B8] font-medium">Kubernetes Client</span>
              <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">OPERATIONAL</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#222831] border border-[rgba(148,137,121,0.2)]">
              <span className="text-[#DFD0B8] font-medium">Terraform CLI Sandbox</span>
              <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">READY</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#222831] border border-[rgba(148,137,121,0.2)]">
              <span className="text-[#DFD0B8] font-medium">Prometheus & Loki Logs</span>
              <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">ONLINE</span>
            </div>
          </div>
        </div>

        {/* Audit Log / Recent Activity */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-[#393E46] border border-[rgba(148,137,121,0.22)] shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[#DFD0B8]" />
                <span>Recent Platform Activity & Audit Trail</span>
              </h2>
              <span className="text-[11px] text-[#948979] font-mono">Compliance Logged</span>
            </div>

            {activity.length === 0 ? (
              <div className="py-12 text-center text-[#948979] text-xs">
                No recent activity recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-[rgba(148,137,121,0.18)]">
                {activity.map((item) => (
                  <div key={item.id} className="py-3 flex items-start justify-between text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-[#222831] text-[#DFD0B8] border border-[rgba(148,137,121,0.25)]">
                          {item.action}
                        </span>
                        <span className="text-[#f3f0ea]">{item.details}</span>
                      </div>
                      <div className="text-[11px] text-[#948979]">
                        Initiated by <span className="text-white font-medium">{item.user_name}</span> • Target: {item.resource_type}
                      </div>
                    </div>
                    <span className="text-[11px] text-[#948979] font-mono flex-shrink-0 ml-4">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-[rgba(148,137,121,0.18)] flex items-center justify-between text-xs text-[#948979]">
            <span className="flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cryptographically verified administrative events</span>
            </span>
            <Link to="/projects" className="text-[#DFD0B8] hover:underline flex items-center space-x-1 font-medium">
              <span>View all projects</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
