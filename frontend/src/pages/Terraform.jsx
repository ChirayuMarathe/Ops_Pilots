import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Binary,
  Layers,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
  ShieldCheck,
  FileCode,
  Plus,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Flame,
  Check,
  X,
  Database,
  ExternalLink,
  Info,
} from 'lucide-react';

const HCL_TEMPLATES = [
  {
    name: 'Local System Config',
    slug: 'local-config',
    description: 'Generates managed configuration artifacts on the local host filesystem',
    main_tf: `terraform {
  required_version = ">= 1.0.0"
}

resource "local_file" "environment_config" {
  filename = "\${path.module}/config.env"
  content  = "APP_ENV=production\\nDEBUG=false\\nPORT=8080\\n"
}

resource "local_file" "system_manifest" {
  filename = "\${path.module}/manifest.json"
  content  = jsonencode({
    platform = "OpsPilot"
    managed  = true
    version  = "2.0.0"
  })
}
`,
  },
  {
    name: 'Docker Microservice Stack',
    slug: 'docker-microservices',
    description: 'Declarative container and virtual bridge network setup for web application',
    main_tf: `terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0.1"
    }
  }
}

resource "docker_network" "private_network" {
  name = "opspilot-network"
}

resource "docker_image" "nginx" {
  name         = "nginx:alpine"
  keep_locally = true
}

resource "docker_container" "web" {
  image = docker_image.nginx.image_id
  name  = "opspilot-web-proxy"
  networks_advanced {
    name = docker_network.private_network.name
  }
  ports {
    internal = 80
    external = 8080
  }
}
`,
  },
  {
    name: 'AWS Cloud VPC & Subnets',
    slug: 'aws-cloud-vpc',
    description: 'High-availability multi-AZ VPC layout with public and private subnets',
    main_tf: `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "region" {
  default = "us-east-1"
}

resource "aws_vpc" "production" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "OpsPilot-Prod-VPC"
    Environment = "production"
    ManagedBy   = "OpsPilot-IaC"
  }
}
`,
  },
];

export const Terraform = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Tab inside workspace studio
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'plan' | 'logs' | 'runs' | 'state'

  // Code editor state
  const [codeContent, setCodeContent] = useState('');
  const [isSavingCode, setIsSavingCode] = useState(false);

  // Runs and state
  const [runs, setRuns] = useState([]);
  const [stateResources, setStateResources] = useState([]);
  const [activeLogOutput, setActiveLogOutput] = useState('');

  // New Workspace Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWsData, setNewWsData] = useState({
    name: '',
    slug: '',
    description: '',
    main_tf: HCL_TEMPLATES[0].main_tf,
    requires_approval: true,
  });

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const res = await api.get('/terraform/workspaces');
      setWorkspaces(res.data);
      if (res.data.length > 0 && !selectedWorkspace) {
        selectWorkspace(res.data[0]);
      } else if (selectedWorkspace) {
        const updated = res.data.find((w) => w.id === selectedWorkspace.id);
        if (updated) setSelectedWorkspace(updated);
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const selectWorkspace = async (ws) => {
    setSelectedWorkspace(ws);
    setCodeContent(ws.main_tf || '');
    setErrorMsg(null);
    setSuccessMsg(null);
    if (ws.last_plan_output) {
      setActiveLogOutput(ws.last_plan_output);
    }

    // Fetch runs and state
    loadWorkspaceRuns(ws.id);
    loadWorkspaceState(ws.id);
  };

  const loadWorkspaceRuns = async (wsId) => {
    try {
      const res = await api.get(`/terraform/workspaces/${wsId}/runs`);
      setRuns(res.data);
    } catch (err) {
      console.error('Failed to fetch runs:', err);
    }
  };

  const loadWorkspaceState = async (wsId) => {
    try {
      const res = await api.get(`/terraform/workspaces/${wsId}/state`);
      setStateResources(res.data);
    } catch (err) {
      console.error('Failed to fetch state resources:', err);
    }
  };

  const handleSaveCode = async () => {
    if (!selectedWorkspace) return;
    try {
      setIsSavingCode(true);
      const res = await api.put(`/terraform/workspaces/${selectedWorkspace.id}`, {
        main_tf: codeContent,
      });
      setSelectedWorkspace(res.data);
      setSuccessMsg('HCL configuration saved successfully. Code changes reset plan approval.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to save configuration.');
    } finally {
      setIsSavingCode(false);
    }
  };

  const executeAction = async (action) => {
    if (!selectedWorkspace) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await api.post(`/terraform/workspaces/${selectedWorkspace.id}/${action}`);
      setActiveLogOutput(res.data.output || 'No output recorded.');
      setActiveTab('logs');

      // Refresh workspace info
      const wsRes = await api.get(`/terraform/workspaces/${selectedWorkspace.id}`);
      setSelectedWorkspace(wsRes.data);
      setWorkspaces((prev) => prev.map((w) => (w.id === wsRes.data.id ? wsRes.data : w)));

      loadWorkspaceRuns(selectedWorkspace.id);
      loadWorkspaceState(selectedWorkspace.id);

      if (res.data.status === 'success') {
        setSuccessMsg(`Action '${action.toUpperCase()}' finished successfully.`);
      } else {
        setErrorMsg(`Action '${action.toUpperCase()}' returned exit code ${res.data.exit_code}.`);
      }
    } catch (err) {
      const detail = err.response?.data?.detail || err.message;
      setErrorMsg(`Failed to execute ${action}: ${detail}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedWorkspace) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      const res = await api.post(`/terraform/workspaces/${selectedWorkspace.id}/approve`);
      setSelectedWorkspace(res.data);
      setWorkspaces((prev) => prev.map((w) => (w.id === res.data.id ? res.data : w)));
      setSuccessMsg('Terraform plan approved by operator. Apply operation is unlocked.');
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to approve plan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setErrorMsg(null);
      const res = await api.post('/terraform/workspaces', newWsData);
      setShowCreateModal(false);
      setWorkspaces((prev) => [...prev, res.data]);
      selectWorkspace(res.data);
      setSuccessMsg(`Workspace '${res.data.name}' initialized.`);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to create workspace.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteWorkspace = async (wsId) => {
    if (!window.confirm('Are you sure you want to delete this workspace and its configuration files?')) return;
    try {
      await api.delete(`/terraform/workspaces/${wsId}`);
      const updated = workspaces.filter((w) => w.id !== wsId);
      setWorkspaces(updated);
      if (selectedWorkspace?.id === wsId) {
        if (updated.length > 0) selectWorkspace(updated[0]);
        else setSelectedWorkspace(null);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to delete workspace.');
    }
  };

  const applyTemplate = (tpl) => {
    setNewWsData({
      ...newWsData,
      name: tpl.name,
      slug: tpl.slug,
      description: tpl.description,
      main_tf: tpl.main_tf,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Infrastructure as Code</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Terraform Engine
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Isolated workspace execution, strict plan approval gates, and multi-cloud state lifecycle tracking.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchWorkspaces}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-card border border-border text-slate-300 hover:text-white hover:bg-slate-800 transition text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Workspace</span>
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Operation Error:</span> {errorMsg}
          </div>
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

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Workspace Selector */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            <span>Workspaces ({workspaces.length})</span>
            <span className="text-[10px] text-slate-500 font-mono">Isolated</span>
          </div>

          <div className="space-y-2">
            {workspaces.map((ws) => {
              const isSelected = selectedWorkspace?.id === ws.id;
              const statusColors = {
                uninitialized: 'bg-slate-800 text-slate-400 border-slate-700',
                initialized: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                planned: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                applied: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                failed: 'bg-red-500/10 text-red-400 border-red-500/20',
                destroyed: 'bg-zinc-800 text-zinc-400 border-zinc-700',
              };

              return (
                <div
                  key={ws.id}
                  onClick={() => selectWorkspace(ws)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-600/10 border-blue-500/40 shadow-sm'
                      : 'bg-card border-border hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm text-white">{ws.name}</h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{ws.slug}</p>
                    </div>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                        statusColors[ws.status] || statusColors.uninitialized
                      }`}
                    >
                      {ws.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/40 text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-400">
                      <Binary className="w-3.5 h-3.5 text-purple-400" />
                      <span>{ws.requires_approval ? 'Approval Gate' : 'Auto Apply'}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWorkspace(ws.id);
                      }}
                      className="text-slate-500 hover:text-red-400 transition"
                      title="Delete Workspace"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {workspaces.length === 0 && !loading && (
              <div className="p-6 rounded-xl border border-dashed border-border text-center text-slate-500 text-sm">
                No Terraform workspaces found. Create one to begin declarative provisioning.
              </div>
            )}
          </div>
        </div>

        {/* Studio View */}
        {selectedWorkspace ? (
          <div className="lg:col-span-3 space-y-6">
            {/* Top Workspace Bar */}
            <div className="p-4 rounded-xl bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-3">
                  <h2 className="text-lg font-bold text-white">{selectedWorkspace.name}</h2>
                  <span className="text-xs font-mono text-slate-400">({selectedWorkspace.slug})</span>
                  {selectedWorkspace.is_approved ? (
                    <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                      Approved by {selectedWorkspace.approved_by || 'Operator'}
                    </span>
                  ) : (
                    selectedWorkspace.requires_approval && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Approval Required
                      </span>
                    )
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">{selectedWorkspace.description || 'No description provided.'}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  disabled={actionLoading}
                  onClick={() => executeAction('init')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition border border-slate-700 disabled:opacity-50"
                >
                  Init
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => executeAction('validate')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition border border-slate-700 disabled:opacity-50"
                >
                  Validate
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => executeAction('plan')}
                  className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-medium transition disabled:opacity-50"
                >
                  Plan
                </button>
                <button
                  disabled={
                    actionLoading ||
                    (selectedWorkspace.requires_approval && !selectedWorkspace.is_approved)
                  }
                  onClick={() => executeAction('apply')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed shadow-sm shadow-emerald-500/20"
                  title={
                    selectedWorkspace.requires_approval && !selectedWorkspace.is_approved
                      ? 'Plan approval is required before applying'
                      : 'Apply plan'
                  }
                >
                  Apply
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => {
                    if (window.confirm('Destroy all infrastructure managed in this workspace?')) {
                      executeAction('destroy');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium transition disabled:opacity-50"
                >
                  Destroy
                </button>
              </div>
            </div>

            {/* Approval Gate Banner (Mandatory Step if Planned & Requires Approval) */}
            {selectedWorkspace.status === 'planned' &&
              selectedWorkspace.requires_approval &&
              !selectedWorkspace.is_approved && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-white">Plan Approval Gate Required</h4>
                      <p className="text-xs text-amber-300/80 mt-0.5">
                        Calculated changes: <span className="font-mono text-emerald-400">+{selectedWorkspace.resources_to_add} to add</span>,{' '}
                        <span className="font-mono text-amber-400">~{selectedWorkspace.resources_to_change} to change</span>,{' '}
                        <span className="font-mono text-red-400">-{selectedWorkspace.resources_to_destroy} to destroy</span>.
                        Review the generated plan below and provide explicit sign-off before unlocking the Apply trigger.
                      </p>
                    </div>
                  </div>
                  <button
                    disabled={actionLoading}
                    onClick={handleApprove}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition flex-shrink-0"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Execution Plan</span>
                  </button>
                </div>
              )}

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-1 border-b border-border text-sm font-medium">
              {[
                { id: 'editor', label: 'HCL Editor (main.tf)', icon: FileCode },
                { id: 'plan', label: 'Plan Inspector', icon: ShieldCheck },
                { id: 'logs', label: 'Console Output', icon: Terminal },
                { id: 'runs', label: `Runs History (${runs.length})`, icon: Clock },
                { id: 'state', label: `State Resources (${stateResources.length})`, icon: Database },
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

            {/* Tab 1: Editor */}
            {activeTab === 'editor' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-[#0d121f] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-[#090d16] border-b border-border/60 text-xs text-slate-400">
                    <span className="font-mono">main.tf</span>
                    <button
                      disabled={isSavingCode}
                      onClick={handleSaveCode}
                      className="flex items-center space-x-1.5 px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" />
                      <span>{isSavingCode ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </div>
                  <textarea
                    value={codeContent}
                    onChange={(e) => setCodeContent(e.target.value)}
                    rows={18}
                    className="w-full bg-transparent p-4 font-mono text-xs text-slate-200 focus:outline-none resize-none leading-relaxed"
                    spellCheck={false}
                  />
                </div>
              </div>
            )}

            {/* Tab 2: Plan Inspector */}
            {activeTab === 'plan' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Resources to Add</p>
                      <p className="text-2xl font-bold font-mono text-emerald-400">
                        +{selectedWorkspace.resources_to_add}
                      </p>
                    </div>
                    <Plus className="w-8 h-8 text-emerald-500/20" />
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Resources to Change</p>
                      <p className="text-2xl font-bold font-mono text-amber-400">
                        ~{selectedWorkspace.resources_to_change}
                      </p>
                    </div>
                    <RefreshCw className="w-8 h-8 text-amber-500/20" />
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Resources to Destroy</p>
                      <p className="text-2xl font-bold font-mono text-red-400">
                        -{selectedWorkspace.resources_to_destroy}
                      </p>
                    </div>
                    <Trash2 className="w-8 h-8 text-red-500/20" />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-[#0d121f] overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#090d16] border-b border-border/60 text-xs font-mono text-slate-400">
                    Latest Terraform Plan Diff
                  </div>
                  <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-96">
                    {selectedWorkspace.last_plan_output || 'No plan output recorded yet. Click "Plan" to calculate state changes.'}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 3: Logs */}
            {activeTab === 'logs' && (
              <div className="rounded-xl border border-border bg-[#090d16] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#0e1424] border-b border-border/60 text-xs font-mono text-slate-400">
                  <div className="flex items-center space-x-2">
                    <Terminal className="w-3.5 h-3.5 text-blue-400" />
                    <span>Terraform CLI Terminal Output</span>
                  </div>
                  <button
                    onClick={() => setActiveLogOutput('')}
                    className="hover:text-slate-200 transition text-[11px]"
                  >
                    Clear Log
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto whitespace-pre-wrap max-h-[460px] leading-relaxed">
                  {activeLogOutput || 'No active terminal output. Trigger an action to stream logs.'}
                </pre>
              </div>
            )}

            {/* Tab 4: Runs History */}
            {activeTab === 'runs' && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <span>Execution Audit Trail</span>
                  <span>{runs.length} Runs</span>
                </div>
                <div className="divide-y divide-border/60">
                  {runs.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => {
                        setActiveLogOutput(r.output_log || '');
                        setActiveTab('logs');
                      }}
                      className="p-3.5 hover:bg-slate-800/40 cursor-pointer transition flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            r.status === 'success' ? 'bg-emerald-400' : 'bg-red-400'
                          }`}
                        />
                        <span className="font-mono font-semibold uppercase text-white">{r.action}</span>
                        <span className="text-slate-400">by {r.initiated_by || 'system'}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-slate-400 font-mono">
                        <span>{r.duration_seconds}s</span>
                        <span>{new Date(r.created_at).toLocaleTimeString()}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                            r.status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                    </div>
                  ))}

                  {runs.length === 0 && (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      No runs recorded for this workspace.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 5: State Resources */}
            {activeTab === 'state' && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <span>Managed State Resources</span>
                  <span>{stateResources.length} Active</span>
                </div>
                <div className="divide-y divide-border/60">
                  {stateResources.map((res, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <Database className="w-4 h-4 text-purple-400" />
                        <div>
                          <p className="font-mono text-white font-medium">{res.address}</p>
                          <p className="text-[11px] text-slate-400">Type: {res.resource_type}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                        Managed
                      </span>
                    </div>
                  ))}

                  {stateResources.length === 0 && (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      No state resources active. Apply the workspace plan to create infrastructure.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-3 p-12 text-center rounded-2xl bg-[#0e1424] border border-border/80">
            <Binary className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Workspace Selected</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              Select an existing workspace from the left sidebar or create a new one using predefined HCL templates.
            </p>
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0e1424] border border-border rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Create Terraform Workspace</h3>
                <p className="text-xs text-slate-400">
                  Initialize an isolated configuration directory with lifecycle controls.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Quick Start Templates
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {HCL_TEMPLATES.map((tpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="p-2.5 rounded-lg border border-border/70 bg-[#090d16] hover:border-blue-500/40 text-left transition"
                  >
                    <p className="font-semibold text-xs text-white">{tpl.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{tpl.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Workspace Name</label>
                  <input
                    type="text"
                    required
                    value={newWsData.name}
                    onChange={(e) =>
                      setNewWsData({
                        ...newWsData,
                        name: e.target.value,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                      })
                    }
                    placeholder="e.g. Production Network"
                    className="w-full px-3 py-2 bg-[#090d16] border border-border rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Directory Slug</label>
                  <input
                    type="text"
                    required
                    value={newWsData.slug}
                    onChange={(e) => setNewWsData({ ...newWsData, slug: e.target.value })}
                    placeholder="e.g. prod-network"
                    className="w-full px-3 py-2 bg-[#090d16] border border-border rounded-lg text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  value={newWsData.description}
                  onChange={(e) => setNewWsData({ ...newWsData, description: e.target.value })}
                  placeholder="Target cloud or infrastructure purpose"
                  className="w-full px-3 py-2 bg-[#090d16] border border-border rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Initial main.tf HCL</label>
                <textarea
                  value={newWsData.main_tf}
                  onChange={(e) => setNewWsData({ ...newWsData, main_tf: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 bg-[#090d16] border border-border rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                  spellCheck={false}
                />
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg bg-[#090d16] border border-border/80">
                <input
                  type="checkbox"
                  id="requires_approval"
                  checked={newWsData.requires_approval}
                  onChange={(e) => setNewWsData({ ...newWsData, requires_approval: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="requires_approval" className="text-xs text-slate-300 cursor-pointer">
                  <span className="font-semibold text-white">Require Operator Plan Approval:</span> Disallow
                  Terraform apply until plan output is explicitly verified and approved.
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-card border border-border text-slate-300 hover:text-white text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
