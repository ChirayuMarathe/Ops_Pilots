import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  GitBranch,
  PlayCircle,
  History,
  Server,
  Cpu,
  Layers,
  Box,
  Binary,
  BarChart2,
  LineChart,
  FileText,
  AlertTriangle,
  Flame,
  ShieldCheck,
  KeyRound,
  FileCheck2,
  Settings,
} from 'lucide-react';

export const Sidebar = () => {
  const navSections = [
    {
      title: 'Core',
      items: [
        { label: 'Overview', to: '/', icon: LayoutDashboard },
        { label: 'Projects', to: '/projects', icon: FolderGit2 },
      ],
    },
    {
      title: 'CI/CD Pipelines',
      items: [
        { label: 'Pipelines', to: '/pipelines', icon: PlayCircle },
        { label: 'Integrations', to: '/integrations', icon: Settings },
      ],
    },
    {
      title: 'Infrastructure',
      items: [
        { label: 'Containers (Docker)', to: '/infrastructure/containers', icon: Box },
        { label: 'Kubernetes Workloads', to: '/infrastructure/kubernetes', icon: Layers },
        { label: 'Terraform (IaC)', to: '/infrastructure/terraform', icon: Binary, badge: 'Phase 6' },
      ],
    },
    {
      title: 'Observability',
      items: [
        { label: 'Metrics (Prometheus)', to: '/observability/metrics', icon: BarChart2, badge: 'Phase 5' },
        { label: 'Dashboards (Grafana)', to: '/observability/dashboards', icon: LineChart, badge: 'Phase 5' },
        { label: 'Central Logs (Loki)', to: '/observability/logs', icon: FileText, badge: 'Phase 5' },
      ],
    },
    {
      title: 'Security & Operations',
      items: [
        { label: 'Incidents', to: '/incidents', icon: Flame, badge: 'Phase 8' },
        { label: 'Security & Trivy', to: '/security', icon: ShieldCheck, badge: 'Phase 8' },
      ],
    },
  ];

  return (
    <aside className="w-64 border-r border-border bg-[#0a0f1d] min-h-[calc(100vh-4rem)] flex flex-col justify-between p-4">
      <div className="space-y-6">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
              {section.title}
            </h3>
            {section.items.map((item, itemIdx) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={itemIdx}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-border/60">
        <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
          <div className="font-semibold text-slate-300">Phase 4: Active</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Kubernetes Cluster & Workload Orchestration</div>
        </div>
      </div>
    </aside>
  );
};

