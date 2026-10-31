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
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <span>Welcome back, {user?.full_name || user?.username}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            OpsPilot Platform Overview • Real-time infrastructure & workload telemetry
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 transition text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <Link
            to="/projects"
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition text-sm shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Register Project</span>
          </Link>
        </div>
      </div>

      {/* 6 Mandatory Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Total Projects */}
        <div className="p-5 rounded-xl bg-[#0e1424] border border-border/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Projects</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FolderGit2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-white">
              {loading ? '...' : summary?.total_projects ?? 0}
            </div>
            <p className="text-xs text-slate-400 mt-1">Connected repositories & applications</p>
          </div>
        </div>

        {/* Card 2: Active Deployments */}
        <div className="p-5 rounded-xl bg-[#0e1424] border border-border/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Deployments</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Rocket className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-white">
              {loading ? '...' : summary?.active_deployments ?? 0}
            </div>
            <p className="text-xs text-slate-400 mt-1">Currently deployed workloads</p>
          </div>
        </div>

        {/* Card 3: Healthy Services */}
        <div className="p-5 rounded-xl bg-[#0e1424] border border-border/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Healthy Services</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-white">
              {loading ? '...' : summary?.healthy_services ?? 0}
            </div>
            <p className="text-xs text-slate-400 mt-1">Healthy application instances</p>
          </div>
        </div>

        {/* Card 4: Failed Deployments */}
        <div className="p-5 rounded-xl bg-[#0e1424] border border-border/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Failed Deployments</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-white">
              {loading ? '...' : summary?.failed_deployments ?? 0}
            </div>
            <p className="text-xs text-slate-400 mt-1">Failed deployment attempts</p>
          </div>
        </div>

        {/* Card 5: Infrastructure Status */}
        <div className="p-5 rounded-xl bg-[#0e1424] border border-border/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Infrastructure Status</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${getStatusColor(
                  summary?.infrastructure_status
                )}`}
              >
                {loading ? '...' : summary?.infrastructure_status || 'Ready'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">Overall cluster & orchestrator health</p>
          </div>
        </div>

        {/* Card 6: Recent Incidents */}
        <div className="p-5 rounded-xl bg-[#0e1424] border border-border/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recent Incidents</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-white">
              {loading ? '...' : summary?.recent_incidents ?? 0}
            </div>
            <p className="text-xs text-slate-400 mt-1">Latest detected problems & active alerts</p>
          </div>
        </div>
      </div>

      {/* Integration Matrix & Recent Auditing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Subsystems Matrix */}
        <div className="lg:col-span-1 p-6 rounded-xl bg-[#0e1424] border border-border/80 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center space-x-2">
            <Server className="w-4 h-4 text-blue-400" />
            <span>Integration Status</span>
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-300">FastAPI Gateway</span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">ONLINE</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-300">PostgreSQL Store</span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">CONNECTED</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-300">GitHub Actions (Phase 2)</span>
              <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">STANDBY</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-300">Docker Engine (Phase 3)</span>
              <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">STANDBY</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-300">Kubernetes Kind (Phase 4)</span>
              <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">STANDBY</span>
            </div>
          </div>
        </div>

        {/* Audit Log / Recent Activity */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-[#0e1424] border border-border/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Recent Platform Activity & Audit Trail</span>
              </h2>
              <span className="text-xs text-slate-400">Non-repudiation logged</span>
            </div>

            {activity.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                No recent activity recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {activity.map((item) => (
                  <div key={item.id} className="py-3 flex items-start justify-between text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {item.action}
                        </span>
                        <span className="text-slate-200">{item.details}</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Initiated by <span className="text-slate-300">{item.user_name}</span> • Target: {item.resource_type}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-mono flex-shrink-0 ml-4">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cryptographically verified events</span>
            </span>
            <Link to="/projects" className="text-blue-400 hover:text-blue-300 flex items-center space-x-1">
              <span>View all projects</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

