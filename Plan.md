# OpsPilot: Master Engineering Instruction

You are acting as a Senior DevOps Engineer, Platform Engineer, Backend Architect and Frontend Developer.

Your task is to build OpsPilot, a production-style DevOps automation and observability platform.

## Product Objective

Build a self-hostable internal developer platform that allows engineering teams to connect GitHub repositories, automate CI/CD, manage Docker containers, deploy applications to Kubernetes, manage infrastructure using Terraform, and monitor applications through Prometheus, Grafana and Loki.

This must be a functional application, not a static dashboard or UI prototype.

## Technology Stack

Frontend:
- React
- Vite
- JavaScript
- Tailwind CSS
- shadcn/ui
- Lucide icons

Backend:
- Python
- FastAPI
- PostgreSQL
- SQLAlchemy
- JWT authentication
- Pydantic

DevOps:
- Linux
- Docker
- Docker Compose
- GitHub Actions
- Kubernetes
- kind
- Helm
- Terraform
- AWS
- Ansible

Observability:
- Prometheus
- Grafana
- Loki

Security:
- Trivy
- Kubernetes RBAC
- IAM
- Secure secret management
- Audit logging

## Core Modules

1. Authentication and user management.
2. Main infrastructure dashboard.
3. GitHub repository integration.
4. CI/CD pipeline monitoring.
5. Docker container management.
6. Kubernetes cluster and workload management.
7. Terraform infrastructure management.
8. Prometheus metrics integration.
9. Grafana dashboard integration.
10. Loki centralized logging.
11. Security and vulnerability scanning.
12. Incident management.
13. Audit logs and activity tracking.

## Engineering Requirements

- Use modular architecture.
- Keep frontend, backend and infrastructure code separated.
- Build reusable UI components.
- Use REST APIs for frontend-backend communication.
- Implement database migrations.
- Implement authentication and authorization.
- Use environment variables for configuration.
- Implement structured logging.
- Add automated tests.
- Include Dockerfiles and Docker Compose configuration.
- Implement meaningful error handling.
- Document every integration.
- Avoid unnecessary abstractions and microservices.

## Critical Security Rules

- Never hardcode secrets.
- Never expose private GitHub tokens.
- Never expose unrestricted Docker socket access.
- Never execute arbitrary Terraform commands through public endpoints.
- Never allow unauthenticated infrastructure operations.
- Implement audit logging for sensitive actions.
- Use isolated and restricted execution environments.
- Require explicit approval for destructive infrastructure operations.
- Default to read-only Kubernetes access until write permissions are properly implemented.

## Development Method

Work incrementally.

PHASE 1:
Create the repository structure, React frontend, FastAPI backend, PostgreSQL database, Docker Compose setup and authentication.

PHASE 2:
Implement GitHub OAuth, repository integration and CI/CD pipeline tracking using GitHub Actions.

PHASE 3:
Implement Docker integration.

PHASE 4:
Implement Kubernetes integration using a local kind cluster.

PHASE 5:
Integrate Prometheus, Grafana and Loki.

PHASE 6:
Implement Terraform validation, planning and controlled execution.

PHASE 7:
Add AWS infrastructure support, IAM integration and secure secrets management.

PHASE 8:
Implement incidents, security scanning, audit logs and final documentation.

## Mandatory Workflow

Before implementing anything:

1. Inspect the existing workspace.
2. Create a detailed implementation plan.
3. Define the repository structure.
4. Identify dependencies and integration requirements.
5. Define database entities.
6. Document the architecture.
7. Break development into small, verifiable tasks.

Then start implementing Phase 1.

Do not attempt to implement all phases simultaneously.

After each phase:
- Run the application.
- Execute automated tests.
- Verify integrations.
- Fix errors.
- Update documentation.
- Report what works and what remains incomplete.

## Important Product Rules

Every dashboard metric must come from a real integration or be explicitly labelled as demonstration data.

Every button must perform its advertised action.

Never simulate a successful deployment when no deployment occurred.

Never claim infrastructure is healthy without checking its actual status.

If an external integration is unavailable, show a clear connection or configuration state.

The finished platform should demonstrate real-world DevOps engineering, not merely attractive frontend design.

## First Deliverable

Start by generating:

1. Architecture documentation.
2. Repository folder structure.
3. Database schema.
4. API endpoint plan.
5. Phase-by-phase implementation plan.
6. Initial React application.
7. Initial FastAPI application.
8. PostgreSQL integration.
9. Docker Compose environment.
10. Authentication flow.

Do not proceed to Phase 2 until Phase 1 runs successfully and its tests pass.

Begin by inspecting the workspace and preparing the architecture and implementation plan.