import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Terminal, ArrowRight, AlertCircle, Shield } from 'lucide-react';

export const Login = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(usernameOrEmail, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#222831] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-[#393E46] border border-[rgba(148,137,121,0.3)] text-[#DFD0B8] mb-4 shadow-subtle">
            <Terminal className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Sign in to OpsPilot</h1>
          <p className="text-xs text-[#948979] mt-1 font-mono">Enterprise Internal Developer Platform & Observability</p>
        </div>

        <div className="p-8 rounded-2xl bg-[#393E46] border border-[rgba(148,137,121,0.25)] shadow-elevation">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#DFD0B8] uppercase tracking-wider mb-1.5 font-mono">
                Username or Email
              </label>
              <input
                type="text"
                required
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="devops_lead or admin@opspilot.io"
                className="w-full px-4 py-2.5 rounded-lg bg-[#222831] border border-[rgba(148,137,121,0.25)] text-white placeholder-[#948979] focus:outline-none focus:border-[#DFD0B8] text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#DFD0B8] uppercase tracking-wider mb-1.5 font-mono">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 rounded-lg bg-[#222831] border border-[rgba(148,137,121,0.25)] text-white placeholder-[#948979] focus:outline-none focus:border-[#DFD0B8] text-xs font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-2.5 px-4 rounded-lg bg-[#DFD0B8] hover:bg-[#ece2d0] font-semibold text-[#222831] transition flex items-center justify-center space-x-2 text-xs shadow-subtle disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign in to Platform'}</span>
              {!loading && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[rgba(148,137,121,0.2)] text-center">
            <p className="text-xs text-[#948979]">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#DFD0B8] font-semibold hover:underline">
                Register operator account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
