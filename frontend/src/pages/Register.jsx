import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Terminal, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

export const Register = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(email, username, password, fullName);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#222831] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-[#393E46] border border-[rgba(148,137,121,0.3)] text-[#DFD0B8] mb-4 shadow-subtle">
            <Terminal className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Create OpsPilot Account</h1>
          <p className="text-xs text-[#948979] mt-1 font-mono">Enterprise Internal Developer Platform & Observability</p>
        </div>

        <div className="p-8 rounded-2xl bg-[#393E46] border border-[rgba(148,137,121,0.25)] shadow-elevation">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2.5">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>Account created successfully! Redirecting to login...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#DFD0B8] uppercase tracking-wider mb-1.5 font-mono">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Senior DevOps Engineer"
                className="w-full px-4 py-2 rounded-lg bg-[#222831] border border-[rgba(148,137,121,0.25)] text-white placeholder-[#948979] focus:outline-none focus:border-[#DFD0B8] text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#DFD0B8] uppercase tracking-wider mb-1.5 font-mono">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@company.com"
                className="w-full px-4 py-2 rounded-lg bg-[#222831] border border-[rgba(148,137,121,0.25)] text-white placeholder-[#948979] focus:outline-none focus:border-[#DFD0B8] text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#DFD0B8] uppercase tracking-wider mb-1.5 font-mono">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="devops_lead"
                className="w-full px-4 py-2 rounded-lg bg-[#222831] border border-[rgba(148,137,121,0.25)] text-white placeholder-[#948979] focus:outline-none focus:border-[#DFD0B8] text-xs font-mono"
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
                className="w-full px-4 py-2 rounded-lg bg-[#222831] border border-[rgba(148,137,121,0.25)] text-white placeholder-[#948979] focus:outline-none focus:border-[#DFD0B8] text-xs font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-2.5 px-4 rounded-lg bg-[#DFD0B8] hover:bg-[#ece2d0] font-semibold text-[#222831] transition flex items-center justify-center space-x-2 text-xs shadow-subtle disabled:opacity-50"
            >
              <span>{loading ? 'Creating Account...' : 'Register Operator'}</span>
              {!loading && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[rgba(148,137,121,0.2)] text-center">
            <p className="text-xs text-[#948979]">
              Already registered?{' '}
              <Link to="/login" className="text-[#DFD0B8] font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
