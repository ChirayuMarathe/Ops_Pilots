import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Github,
  CheckCircle2,
  AlertCircle,
  Key,
  Shield,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  RefreshCw,
} from 'lucide-react';

export const Integrations = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenInput, setTokenInput] = useState('');
  const [webhookSecretInput, setWebhookSecretInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/github/status');
      setStatus(res.data);
    } catch (err) {
      console.error('Failed to load GitHub integration status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await api.post('/github/connect', {
        access_token: tokenInput,
        webhook_secret: webhookSecretInput || undefined,
      });
      setStatus(res.data);
      setTokenInput('');
      setWebhookSecretInput('');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to connect GitHub account. Verify token permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect GitHub account? Existing pipeline triggers may be disabled.')) return;
    try {
      await api.delete('/github/disconnect');
      setStatus({ is_connected: false, status: 'disconnected' });
    } catch (err) {
      console.error('Failed to disconnect GitHub:', err);
    }
  };

  const webhookUrl = `${window.location.origin.replace('3000', '8000').replace('5173', '8000')}/api/v1/github/webhooks`;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="pb-6 border-b border-border">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
          <Github className="w-6 h-6 text-slate-100" />
          <span>Integrations & Developer Providers</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure external access tokens, webhooks and platform connections
        </p>
      </div>

      {/* GitHub Integration Card */}
      <div className="p-6 rounded-2xl bg-[#0e1424] border border-border/80 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white">
              <Github className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">GitHub API & Actions</h2>
                {status?.is_connected ? (
                  <span className="flex items-center space-x-1 text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>CONNECTED</span>
                  </span>
                ) : (
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    DISCONNECTED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Enables automated repository sync, workflow dispatch and real-time build telemetry
              </p>
            </div>
          </div>

          {status?.is_connected && (
            <button
              onClick={handleDisconnect}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-medium transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          )}
        </div>

        {status?.is_connected ? (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {status.avatar_url && (
                  <img src={status.avatar_url} alt="GitHub avatar" className="w-10 h-10 rounded-full border border-slate-700" />
                )}
                <div>
                  <div className="text-sm font-semibold text-white">@{status.login}</div>
                  <div className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
                    <span>Authorized scopes:</span>
                    <span className="font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                      {status.scopes?.join(', ') || 'repo, workflow'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={fetchStatus}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                title="Refresh Status"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Webhook Configuration Guide */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>Repository Webhook Setup</span>
              </h3>
              <p className="text-xs text-slate-400">
                To receive automated CI/CD triggers when commits are pushed, add this webhook to your GitHub repository under{' '}
                <span className="text-slate-200">Settings → Webhooks → Add webhook</span>:
              </p>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 select-all"
                />
                <button
                  onClick={copyWebhookUrl}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy URL'}</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500 space-y-1">
                <div>• Content type: <span className="text-slate-300 font-mono">application/json</span></div>
                <div>• Events: Select <span className="text-slate-300 font-mono">Workflow runs</span> and <span className="text-slate-300 font-mono">Pushes</span></div>
                <div>• Secret: <span className="text-slate-300 font-mono">opspilot-webhook-secret-shared</span> (or your custom secret)</div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConnect} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                GitHub Personal Access Token (PAT)
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center space-x-1">
                <span>Requires classic token with</span>
                <span className="font-mono text-blue-400">repo</span>
                <span>and</span>
                <span className="font-mono text-blue-400">workflow</span>
                <span>scopes.{' '}</span>
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo,workflow"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline inline-flex items-center space-x-0.5 ml-1"
                >
                  <span>Generate on GitHub</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Webhook Secret (Optional)
              </label>
              <input
                type="text"
                placeholder="Defaults to opspilot-webhook-secret-shared"
                value={webhookSecretInput}
                onChange={(e) => setWebhookSecretInput(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !tokenInput}
              className="py-2.5 px-5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {submitting ? 'Connecting...' : 'Connect GitHub Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
