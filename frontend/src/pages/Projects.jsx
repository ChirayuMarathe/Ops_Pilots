import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  FolderGit2,
  Plus,
  GitBranch,
  ExternalLink,
  Trash2,
  AlertCircle,
  CheckCircle,
  X,
  Search,
} from 'lucide-react';

export const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      await api.post('/projects', {
        name,
        slug,
        description,
        repository_url: repositoryUrl,
        default_branch: defaultBranch,
      });
      setShowModal(false);
      setName('');
      setSlug('');
      setDescription('');
      setRepositoryUrl('');
      fetchProjects();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create project.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await api.delete(`/projects/${id}`);
      fetchProjects();
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(148,137,121,0.2)] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Application Projects</h1>
          <p className="text-xs text-[#948979] mt-1">
            Manage your connected Git repositories, environments, and automated workloads.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#DFD0B8] hover:bg-[#ece2d0] text-[#222831] font-semibold transition text-xs shadow-subtle"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register New Project</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#948979]" />
        <input
          type="text"
          placeholder="Filter projects by name or slug..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#393E46] border border-[rgba(148,137,121,0.25)] text-white placeholder-[#948979] focus:outline-none focus:border-[#DFD0B8] text-xs font-mono"
        />
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="py-16 text-center text-[#948979] text-xs font-mono">Loading projects...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#393E46] border border-[rgba(148,137,121,0.25)]">
          <FolderGit2 className="w-10 h-10 mx-auto text-[#948979] mb-3" />
          <h3 className="text-sm font-semibold text-white">No projects registered yet</h3>
          <p className="text-xs text-[#948979] max-w-md mx-auto mt-1 mb-4">
            Register your first repository to begin automating builds, Kubernetes deployments, and metrics.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg bg-[#DFD0B8] hover:bg-[#ece2d0] text-[#222831] text-xs font-semibold transition"
          >
            Register Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="p-5 rounded-xl bg-[#393E46] border border-[rgba(148,137,121,0.22)] shadow-subtle flex flex-col justify-between hover:border-[rgba(148,137,121,0.4)] transition"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-lg bg-[#222831] text-[#DFD0B8] border border-[rgba(148,137,121,0.25)]">
                      <FolderGit2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">{project.name}</h3>
                      <span className="font-mono text-[11px] text-[#948979]">/{project.slug}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
                    {project.status}
                  </span>
                </div>

                <p className="text-xs text-[#948979] mt-3 line-clamp-2">
                  {project.description || 'No description provided.'}
                </p>

                <div className="mt-4 pt-3 border-t border-[rgba(148,137,121,0.18)] space-y-1.5 text-xs text-[#948979]">
                  <div className="flex items-center space-x-2">
                    <GitBranch className="w-3.5 h-3.5 text-[#948979]" />
                    <span>Default branch: <span className="text-white font-mono">{project.default_branch}</span></span>
                  </div>
                  {project.repository_url && (
                    <div className="flex items-center space-x-2 truncate">
                      <ExternalLink className="w-3.5 h-3.5 text-[#948979]" />
                      <a
                        href={project.repository_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#DFD0B8] hover:underline truncate font-mono text-[11px]"
                      >
                        {project.repository_url}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[rgba(148,137,121,0.18)] flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#948979]">
                  Added {new Date(project.created_at).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleDelete(project.id)}
                  title="Delete project"
                  className="p-1.5 rounded-md hover:bg-[#222831] text-[#948979] hover:text-red-400 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#222831] border border-[rgba(148,137,121,0.3)] w-full max-w-lg rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-[#948979] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-lg font-bold text-white mb-1">Register New Project</h2>
            <p className="text-xs text-[#948979] mb-5">
              Connect a service repository to automate CI/CD pipelines and Kubernetes delivery.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Payment Gateway Service"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }
                  }}
                  className="w-full px-3.5 py-2 rounded-lg bg-[#393E46] border border-[rgba(148,137,121,0.25)] text-white placeholder-[#948979] text-xs focus:outline-none focus:border-[#DFD0B8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Project Slug (URL Identifier)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. payment-gateway"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-[#393E46] border border-[rgba(148,137,121,0.25)] text-white placeholder-[#948979] text-xs font-mono focus:outline-none focus:border-[#DFD0B8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Repository URL
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/organization/repo"
                  value={repositoryUrl}
                  onChange={(e) => setRepositoryUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-[#393E46] border border-[rgba(148,137,121,0.25)] text-white placeholder-[#948979] text-xs font-mono focus:outline-none focus:border-[#DFD0B8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Default Branch
                  </label>
                  <input
                    type="text"
                    required
                    value={defaultBranch}
                    onChange={(e) => setDefaultBranch(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#393E46] border border-[rgba(148,137,121,0.25)] text-white text-xs font-mono focus:outline-none focus:border-[#DFD0B8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Briefly describe this project or workload..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-[#393E46] border border-[rgba(148,137,121,0.25)] text-white placeholder-[#948979] text-xs focus:outline-none focus:border-[#DFD0B8]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-[rgba(148,137,121,0.2)]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#393E46] hover:bg-[#434952] text-[#DFD0B8] text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-[#DFD0B8] hover:bg-[#ece2d0] text-[#222831] text-xs font-semibold transition disabled:opacity-50 shadow-subtle"
                >
                  {submitting ? 'Creating...' : 'Register Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
