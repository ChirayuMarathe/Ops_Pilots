import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  PlayCircle,
  Box,
  Layers,
  Binary,
  BarChart2,
  LineChart,
  FileText,
  Flame,
  ShieldCheck,
  Settings,
} from 'lucide-react';

export const Sidebar = () => {
  const navSections = [
    {
      title: 'Platform Core',
      items: [
        { label: 'Overview', to: '/', icon: LayoutDashboard },
        { label: 'Projects', to: '/projects', icon: FolderGit2 },
      ],
    },
    {
      title: 'Continuous Delivery',
      items: [
        { label: 'Pipelines', to: '/pipelines', icon: PlayCircle },
        { label: 'Integrations', to: '/integrations', icon: Settings },
      ],
    },
    {
      title: 'Infrastructure & Workloads',
      items: [
        { label: 'Containers (Docker)', to: '/infrastructure/containers', icon: Box },
        { label: 'Kubernetes Workloads', to: '/infrastructure/kubernetes', icon: Layers },
        { label: 'Terraform (IaC)', to: '/infrastructure/terraform', icon: Binary },
      ],
    },
    {
      title: 'Telemetry & Logs',
      items: [
        { label: 'Metrics (Prometheus)', to: '/observability/metrics', icon: BarChart2 },
        { label: 'Dashboards (Grafana)', to: '/observability/dashboards', icon: LineChart },
        { label: 'Central Logs (Loki)', to: '/observability/logs', icon: FileText },
      ],
    },
    {
      title: 'Security & Operations',
      items: [
        { label: 'Incidents War Room', to: '/incidents', icon: Flame },
        { label: 'Security & Trivy', to: '/security', icon: ShieldCheck },
      ],
    },
  ];

  return (
    <aside className="w-64 border-r border-[rgba(148,137,121,0.2)] bg-[#222831] min-h-[calc(100vh-4rem)] flex flex-col justify-between p-4 select-none">
      <div className="space-y-6">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <h3 className="text-[10px] font-semibold text-[#948979] uppercase tracking-wider px-3 mb-2 font-mono">
              {section.title}
            </h3>
            {section.items.map((item, itemIdx) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={itemIdx}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                      isActive
                        ? 'bg-[#393E46] text-[#DFD0B8] border border-[rgba(148,137,121,0.35)] shadow-subtle'
                        : 'text-[#948979] hover:text-[#DFD0B8] hover:bg-[#393E46]/50'
                    }`
                  }
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </div>
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-[rgba(148,137,121,0.18)]">
        <div className="px-3 py-2.5 rounded-lg bg-[#393E46]/60 border border-[rgba(148,137,121,0.2)] text-xs text-[#948979]">
          <div className="font-semibold text-[#DFD0B8] flex items-center justify-between">
            <span>OpsPilot Core</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          </div>
          <div className="text-[10px] text-[#948979] mt-0.5 font-mono">
            Environment: Production
          </div>
        </div>
      </div>
    </aside>
  );
};
