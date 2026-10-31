import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Bell, User, LogOut, Terminal, Activity } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-border bg-[#0d121f]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
          <Terminal className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
            OpsPilot
          </span>
          <span className="ml-2 text-xs font-mono uppercase px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800/60 text-blue-300">
            v0.1.0-alpha
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          <span>Core API Active</span>
        </div>

        <div className="h-6 w-px bg-border"></div>

        {user && (
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-200">{user.full_name || user.username}</p>
              <p className="text-xs text-slate-400 capitalize">{user.role}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-semibold text-sm">
              {user.username.substring(0, 2).toUpperCase()}
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

