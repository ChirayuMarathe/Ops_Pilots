import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Pipelines } from './pages/Pipelines';
import { PipelineDetail } from './pages/PipelineDetail';
import { Integrations } from './pages/Integrations';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-400 font-mono text-sm">
        Initializing OpsPilot Session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Placeholder component for upcoming phases
const PhasePlaceholder = ({ phase, title, description }) => (
  <div className="p-12 text-center rounded-2xl bg-[#0e1424] border border-border/80 max-w-2xl mx-auto mt-12">
    <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs mb-4">
      {phase}
    </div>
    <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
    <p className="text-sm text-slate-400 mb-6">{description}</p>
    <div className="text-xs text-slate-500 font-mono">
      OpsPilot Architecture • Incremental Phase Execution in Progress
    </div>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />

            {/* Phase 2: CI/CD & GitHub Integrations */}
            <Route path="pipelines" element={<Pipelines />} />
            <Route path="pipelines/:pipelineId/history" element={<PipelineDetail />} />
            <Route path="integrations" element={<Integrations />} />

            {/* Phase 3: Docker Containers */}
            <Route
              path="infrastructure/containers"
              element={
                <PhasePlaceholder
                  phase="Phase 3 Deliverable"
                  title="Docker Container Management"
                  description="Live container inspect, image tags, CPU/Memory telemetry, restart tracking, and controlled container logs."
                />
              }
            />

            {/* Phase 4: Kubernetes */}
            <Route
              path="infrastructure/kubernetes"
              element={
                <PhasePlaceholder
                  phase="Phase 4 Deliverable"
                  title="Kubernetes Cluster & Workload Management"
                  description="Local kind cluster inspection, Pod status, Deployment configuration, Replica scaling, and controlled rollbacks."
                />
              }
            />

            {/* Phase 6: Terraform */}
            <Route
              path="infrastructure/terraform"
              element={
                <PhasePlaceholder
                  phase="Phase 6 Deliverable"
                  title="Infrastructure as Code (Terraform)"
                  description="Isolated plan inspection, validation runs, and approval-gated cloud provisioning."
                />
              }
            />

            {/* Phase 5: Observability */}
            <Route
              path="observability/metrics"
              element={
                <PhasePlaceholder
                  phase="Phase 5 Deliverable"
                  title="Prometheus Metrics Explorer"
                  description="Real-time PromQL query execution for request rates, error rates, and CPU/memory utilization."
                />
              }
            />
            <Route
              path="observability/dashboards"
              element={
                <PhasePlaceholder
                  phase="Phase 5 Deliverable"
                  title="Grafana Observability Dashboards"
                  description="Unified infrastructure and application telemetry dashboards."
                />
              }
            />
            <Route
              path="observability/logs"
              element={
                <PhasePlaceholder
                  phase="Phase 5 Deliverable"
                  title="Loki Centralized Log Aggregation"
                  description="High-performance LogQL streaming across microservice workloads."
                />
              }
            />

            {/* Phase 8: Incidents & Security */}
            <Route
              path="incidents"
              element={
                <PhasePlaceholder
                  phase="Phase 8 Deliverable"
                  title="Incident & Alert Management"
                  description="Automated incident detection from telemetry thresholds with correlated root cause evidence."
                />
              }
            />
            <Route
              path="security"
              element={
                <PhasePlaceholder
                  phase="Phase 8 Deliverable"
                  title="Security & Vulnerability Auditing"
                  description="Trivy container scanning, least-privilege RBAC controls, and non-repudiation audit trails."
                />
              }
            />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
