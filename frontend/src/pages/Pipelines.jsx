import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  PlayCircle,
  Plus,
  GitBranch,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Layers,
  FolderGit2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  X,
} from 'lucide-react';

export const Pipelines = () => {
  const [pipelines, setPipelines] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState(null);

  // Create form
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [workflowFile, setWorkflowFile] = useState('.github/workflows/deploy.yml');
  const [triggerType, setTriggerType] = useState('push');
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Trigger form
  const [triggerBranch, setTriggerBranch] = useState('main');
  const [triggering, setTriggering] = useState(false);
  const [triggerSuccess, setTriggerSuccess] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pipeRes, projRes] = await Promise.all([
        api.get('/pipelines'),
        api.get('/projects'),
      ]);
      setPipelines(pipeRes.data);
      setProjects(projRes.data);
      if (projRes.data.length > 0 && !projectId) {
        setProjectId(projRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load pipelines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePipeline = async (e) => {
    e.preventDefault();
    setCreateError('');
    setSubmitting(true);

    try {
      await api.post('/pipelines', {
        project_id: projectId,
        name,
        workflow_file: workflowFile,
        trigger_type: triggerType,
        is_active: true,
      });
      setShowCreateModal(false);
      setName('');
      fetchData();
    } catch (err) {
      console.error(err);
      setCreateError(err.response?.data?.detail || 'Failed to register pipeline.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTriggerPipeline = async (e) => {
    e.preventDefault();
    if (!selectedPipeline) return;
    setTriggering(true);

    try {
      const res = await api.post(`/pipelines/${selectedPipeline.id}/trigger`, {
        branch: triggerBranch,
      });
      setTriggerSuccess(res.data);
      setTimeout(() => {
        setShowTriggerModal(false);
        setTriggerSuccess(null);
        fetchData();
      }, 1200);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to trigger pipeline dispatch.');
    } finally {
      setTriggering(false);
    }
  };

  const openTriggerModal = (pipe) => {
    setSelectedPipeline(pipe);
    setTriggerBranch('main');
    setShowTriggerModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <PlayCircle className="w-6 h-6 text-blue-400" />
            <span>CI/CD Pipelines</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Orchestrate GitHub Actions workflows, inspect pipeline stages, and track build history
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-400 hover:text-white transition text-sm"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition text-sm shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Register Pipeline</span>
          </button>
        </div>
      </div>

      {/* Pipelines List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 font-mono text-sm">Loading pipelines...</div>
      ) : pipelines.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#0e1424] border border-border/80">
          <PlayCircle className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-lg font-semibold text-white">No CI/CD pipelines defined yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-6">
            Register a GitHub Actions workflow from your connected repository to automate tests, container builds, and Kubernetes delivery.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition"
          >
            Register First Pipeline
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {pipelines.map((pipe) => {
            const project = projects.find((p) => p.id === pipe.project_id);
            return (
              <div
                key={pipe.id}
                className="p-5 rounded-xl bg-[#0e1424] border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <PlayCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-white text-base">{pipe.name}</h3>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          {pipe.trigger_type}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center space-x-1">
                          <FolderGit2 className="w-3.5 h-3.5" />
                          <span>{project?.name || 'Project'}</span>
                        </span>
                        <span>•</span>
                        <span className="font-mono text-slate-300">{pipe.workflow_file}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 self-end md:self-center">
                  <Link
                    to={`/pipelines/${pipe.id}/history`}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs font-medium"
                  >
                    <span>View Stages & History</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={() => openTriggerModal(pipe)}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition text-xs font-medium shadow-md shadow-blue-600/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Pipeline</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Register Pipeline Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e1424] border border-border/80 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1">Register CI/CD Pipeline</h2>
            <p className="text-xs text-slate-400 mb-6">
              Connect a GitHub Actions workflow to enable automated delivery and stage tracking.
            </p>

            {createError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePipeline} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Target Project
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name} ({proj.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Pipeline Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production Deployment Pipeline"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  GitHub Actions Workflow File
                </label>
                <input
                  type="text"
                  required
                  placeholder=".github/workflows/deploy.yml"
                  value={workflowFile}
                  onChange={(e) => setWorkflowFile(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-400 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Trigger Mechanism
                </label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="push">On Code Push (Webhook)</option>
                  <option value="manual">Manual Dispatch Only</option>
                  <option value="pull_request">On Pull Request</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Register Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trigger Modal */}
      {showTriggerModal && selectedPipeline && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e1424] border border-border/80 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowTriggerModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1">Run Pipeline</h2>
            <p className="text-xs text-slate-400 mb-6">
              Dispatch <span className="text-slate-200 font-semibold">{selectedPipeline.name}</span> workflow.
            </p>

            {triggerSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>Workflow dispatched! Run #{triggerSuccess.run_number} queued.</span>
              </div>
            ) : (
              <form onSubmit={handleTriggerPipeline} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Target Branch
                  </label>
                  <div className="relative">
                    <GitBranch className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={triggerBranch}
                      onChange={(e) => setTriggerBranch(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowTriggerModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={triggering}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{triggering ? 'Dispatching...' : 'Dispatch Workflow'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

