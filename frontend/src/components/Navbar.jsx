import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Terminal, Activity, LogOut, Shield } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-[rgba(148,137,121,0.2)] bg-[#222831]/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-[#393E46] border border-[rgba(148,137,121,0.25)] text-[#DFD0B8]">
          <Terminal className="w-4 h-4" />
        </div>
        <div className="flex items-center space-x-2.5">
          <span className="font-semibold text-lg tracking-tight text-[#DFD0B8]">
            OpsPilot
          </span>
          <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#393E46] border border-[rgba(148,137,121,0.3)] text-[#948979]">
            IDP Enterprise
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-[#393E46]/80 border border-[rgba(148,137,121,0.25)] text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-[#DFD0B8] font-mono text-[11px]">System Online</span>
        </div>

        <div className="h-5 w-px bg-[rgba(148,137,121,0.25)]"></div>

        {user && (
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-white">{user.full_name || user.username}</p>
              <p className="text-[11px] font-mono text-[#948979] capitalize">{user.role}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#393E46] border border-[rgba(148,137,121,0.4)] flex items-center justify-center text-[#DFD0B8] font-mono font-semibold text-xs">
              {user.username.substring(0, 2).toUpperCase()}
            </div>
            <button
              onClick={logout}
              title="Logout session"
              className="p-1.5 rounded-lg hover:bg-[#393E46] text-[#948979] hover:text-red-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
