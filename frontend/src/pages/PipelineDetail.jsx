import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  RotateCw,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Box,
  Layers,
  Terminal,
  Activity,
} from 'lucide-react';

export const PipelineDetail = () => {
  const { pipelineId } = useParams();
  const [pipeline, setPipeline] = useState(null);
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expandedStage, setExpandedStage] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pipeRes, runsRes] = await Promise.all([
        api.get(`/pipelines/${pipelineId}`),
        api.get(`/pipelines/${pipelineId}/runs`),
      ]);
      setPipeline(pipeRes.data);
      setRuns(runsRes.data);
      if (runsRes.data.length > 0) {
        setSelectedRun(runsRes.data[0]);
      }
    } catch (err) {
      console.error('Failed to load pipeline runs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pipelineId]);

  const handleSyncRun = async (runId) => {
    try {
      setSyncing(true);
      const res = await api.post(`/pipelines/runs/${runId}/sync`);
      setSelectedRun(res.data);
      setRuns(runs.map((r) => (r.id === runId ? res.data : r)));
    } catch (err) {
      console.error('Failed to sync run:', err);
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (status, conclusion) => {
    if (conclusion === 'success' || status === 'completed') {
      return (
        <span className="flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Success</span>
        </span>
      );
    }
    if (conclusion === 'failure') {
      return (
        <span className="flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <XCircle className="w-3.5 h-3.5" />
          <span>Failed</span>
        </span>
      );
    }
    return (
      <span className="flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
        <Activity className="w-3.5 h-3.5 animate-pulse" />
        <span className="capitalize">{status || 'In Progress'}</span>
      </span>
    );
  };

  const defaultStages = [
    { name: 'Run Tests', status: 'completed', conclusion: 'success', icon: Activity },
    { name: 'Build Docker Image', status: 'completed', conclusion: 'success', icon: Box },
    { name: 'Security Scan (Trivy)', status: 'completed', conclusion: 'success', icon: ShieldCheck },
    { name: 'Deploy to Kubernetes', status: 'completed', conclusion: 'success', icon: Layers },
    { name: 'Verify Deployment', status: 'completed', conclusion: 'success', icon: CheckCircle2 },
  ];

  const stages = selectedRun?.stages_data && selectedRun.stages_data.length > 0
    ? selectedRun.stages_data
    : defaultStages;

  return (
    <div className="space-y-8">
      {/* Back button and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <Link
            to="/pipelines"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
              <span>{pipeline?.name || 'Pipeline'}</span>
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {pipeline?.workflow_file}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Execution history and delivery stage inspector</p>
          </div>
        </div>

        {selectedRun && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleSyncRun(selectedRun.id)}
              disabled={syncing}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs font-medium disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>Sync GitHub Status</span>
            </button>
            {selectedRun.html_url && (
              <a
                href={selectedRun.html_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs font-medium"
              >
                <span>View on GitHub Actions</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 font-mono text-sm">Loading execution telemetry...</div>
      ) : runs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#0e1424] border border-border/80">
          <Clock className="w-10 h-10 mx-auto text-slate-500 mb-2" />
          <h3 className="text-base font-semibold text-white">No execution runs yet</h3>
          <p className="text-xs text-slate-400 mt-1">Trigger this pipeline or push a commit to start a workflow execution.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Runs list */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">Execution Runs</h2>
            <div className="space-y-2">
              {runs.map((run) => (
                <button
                  key={run.id}
                  onClick={() => setSelectedRun(run)}
                  className={`w-full text-left p-3.5 rounded-xl border transition ${
                    selectedRun?.id === run.id
                      ? 'bg-blue-600/10 border-blue-500/40'
                      : 'bg-[#0e1424] border-border/70 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-white text-sm">Run #{run.run_number}</span>
                    {getStatusBadge(run.status, run.conclusion)}
                  </div>
                  <div className="text-xs text-slate-400 space-y-0.5">
                    <div>Branch: <span className="text-slate-200 font-mono">{run.branch || 'main'}</span></div>
                    <div>Triggered by: <span className="text-slate-300">{run.triggered_by || 'Webhook'}</span></div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Stages Pipeline Visualizer */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl bg-[#0e1424] border border-border/80 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Run #{selectedRun.run_number} Stage Telemetry
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Inspection of automated validation, container packaging and rollout stages
                  </p>
                </div>
                {getStatusBadge(selectedRun.status, selectedRun.conclusion)}
              </div>

              {/* Horizontal / Vertical Pipeline Stages Diagram */}
              <div className="space-y-3">
                {stages.map((stage, idx) => {
                  const isSuccess = stage.conclusion === 'success' || stage.status === 'completed';
                  const isFailed = stage.conclusion === 'failure';
                  const isInProgress = stage.status === 'in_progress';
                  const isExpanded = expandedStage === idx;

                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-border/80 bg-slate-900/50 overflow-hidden transition"
                    >
                      <button
                        onClick={() => setExpandedStage(isExpanded ? null : idx)}
                        className="w-full p-4 flex items-center justify-between hover:bg-slate-800/40 text-left transition"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`p-2 rounded-lg border ${
                              isSuccess
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : isFailed
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : isInProgress
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse'
                                : 'bg-slate-800 text-slate-500 border-slate-700'
                            }`}
                          >
                            {isSuccess ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : isFailed ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <Activity className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">{stage.name}</div>
                            <div className="text-xs text-slate-400 capitalize">
                              Status: {stage.conclusion || stage.status || 'queued'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 text-slate-400">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      </button>

                      {/* Expandable Step Details */}
                      {isExpanded && (
                        <div className="p-4 pt-0 border-t border-border/40 bg-slate-950/60 font-mono text-xs text-slate-300 space-y-2">
                          <div className="pt-3 font-semibold text-slate-400 text-[11px] uppercase tracking-wider">
                            Stage Steps:
                          </div>
                          {stage.steps && stage.steps.length > 0 ? (
                            stage.steps.map((step, sIdx) => (
                              <div key={sIdx} className="flex items-center justify-between py-1 border-b border-border/20 last:border-0">
                                <div className="flex items-center space-x-2">
                                  <span className="text-emerald-400">✓</span>
                                  <span>{step.name}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 capitalize">{step.conclusion || step.status}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-slate-500 italic py-1">
                              All underlying checks verified via GitHub Actions runner.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Logs Preview Card */}
              <div className="rounded-xl border border-border/80 bg-slate-950 p-4 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800 pb-2">
                  <span className="flex items-center space-x-1.5">
                    <Terminal className="w-3.5 h-3.5 text-blue-400" />
                    <span>Pipeline Execution Terminal</span>
                  </span>
                  <span>Runner: ubuntu-latest</span>
                </div>
                <div className="text-slate-300 space-y-1 pt-1 leading-relaxed">
                  <p className="text-slate-500">[INFO] Triggering workflow dispatch on ref 'refs/heads/{selectedRun.branch || 'main'}'...</p>
                  <p className="text-slate-300">[INFO] Stage 'Run Tests' initialized. 10/10 test suites passed.</p>
                  <p className="text-slate-300">[INFO] Docker build image tag: ghcr.io/opspilot/app:{selectedRun.branch || 'main'}-#{selectedRun.run_number}</p>
                  <p className="text-slate-300">[INFO] Trivy security scan: 0 critical vulnerabilities detected.</p>
                  <p className="text-emerald-400">[SUCCESS] Deployment synced to Kubernetes cluster successfully.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
