Project identity
- Name: OpsPilot
- Category: DevOps / Platform Engineering
- Type: Infrastructure Automation & Observability Platform
- Architecture: Full-stack, containerized, cloud-native
- Primary objective: Automate application deployment and provide centralized infrastructure monitoring.
- Target users: DevOps engineers, platform engineers, backend developers and engineering teams.

1. Project overview
OpsPilot is a self-hostable DevOps platform designed to simplify the process of building, deploying, managing and monitoring applications.

It provides a centralized interface through which developers can:
1. Connect their GitHub repositories.
2. Trigger automated CI/CD pipelines.
3. Build and manage Docker images.
4. Deploy applications to Kubernetes.
5. Monitor application and infrastructure health.
6. View centralized application logs.
7. Manage infrastructure through Terraform.
8. Identify deployment failures and troubleshoot incidents.
9. Track deployment history and perform rollbacks.
10. Monitor security and infrastructure configuration.
The platform should behave like a lightweight internal developer platform (IDP).

Important: OpsPilot itself is not a replacement for Kubernetes, Terraform, Prometheus or GitHub Actions. It integrates these tools into one operational interface.
2. Technology stack
Use the following technologies.
Layer	Technology
Frontend	React + Vite
Language	JavaScript initially, TypeScript optional later
Styling	Tailwind CSS
UI components	shadcn/ui
Icons	Lucide
Backend	Python + FastAPI
Database	PostgreSQL
ORM	SQLAlchemy
Authentication	JWT + secure password hashing
Containerization	Docker
Local orchestration	Docker Compose
CI/CD	GitHub Actions
Container registry	GitHub Container Registry
Kubernetes	Kubernetes + kind
Package management	Helm
Infrastructure as Code	Terraform
Cloud	AWS
Configuration management	Ansible
Metrics	Prometheus
Dashboards	Grafana
Logging	Loki + Promtail or Grafana Alloy
Secrets	Environment variables locally, AWS Secrets Manager in cloud
Version control	Git + GitHub

Do not introduce additional technologies without a clear architectural reason.
3. Application architecture







dev.to


The system should have the following architecture:
                 DEVELOPER
                     |
                     v
              React Frontend
                     |
                     v
                FastAPI API
                     |
          +----------+----------+
          |          |          |
          v          v          v
       GitHub    PostgreSQL   Operations
       Service     Database    Services
          |                     |
          v                     v
     GitHub Actions        Docker Engine
                                |
                                v
                           Kubernetes
                                |
                  +-------------+-------------+
                  |             |             |
                  v             v             v
              Prometheus      Logging       Terraform
                  |           System        Modules
                  v             |             |
                Grafana         v             v
                  |           Loki         AWS Cloud
                  |
                  v
             OpsPilot UI


Architecture rules:
- Frontend must communicate with the backend through REST APIs.
- Backend must own business logic and orchestration.
- PostgreSQL stores application metadata and deployment history.
- GitHub Actions executes CI/CD workflows.
- Kubernetes manages deployed applications.
- Prometheus collects metrics.
- Grafana visualizes metrics.
- Loki handles log aggregation.
- Terraform manages infrastructure.
- Secrets must never be committed to Git.
4. Main application modules
These are the actual modules we need to implement.
Module A: Authentication and dashboard







github.com


Build a professional dashboard with:
- User registration and login.
- JWT-based authentication.
- Protected routes.
- User profile.
- Dashboard overview.
- Project statistics.
- Infrastructure health.
- Deployment status.
- Recent activity.
Dashboard cards:
Card	Information
Total Projects	Connected repositories
Active Deployments	Currently deployed workloads
Healthy Services	Healthy application instances
Failed Deployments	Failed deployment attempts
Infrastructure Status	Overall infrastructure health
Recent Incidents	Latest detected problems

All statistics must come from actual backend data, not hardcoded numbers.
Module B: GitHub integration







synlets.com


Users should be able to:
- Connect their GitHub account using OAuth.
- View accessible repositories.
- Select a repository.
- Register a repository as an OpsPilot project.
- View branches and commits.
- View webhook events.
- Trigger a pipeline manually.
- View pipeline execution status.
Integration requirements:
- GitHub OAuth.
- GitHub REST API.
- Webhooks.
- GitHub Actions workflow integration.
Security requirements:
- Store tokens securely.
- Request minimum required permissions.
- Validate webhook signatures.
- Never expose access tokens to the frontend.
Module C: CI/CD pipeline management







medium.com


This is one of the most important modules.

When a developer pushes code:
Developer Pushes Code
         |
         v
    GitHub Webhook
         |
         v
    Start Pipeline
         |
         v
      Run Tests
         |
         v
   Build Docker Image
         |
         v
   Security Scan Image
         |
         v
  Push Image to GHCR
         |
         v
   Deploy to Kubernetes
         |
         v
   Verify Deployment
         |
         v
      SUCCESS


Features:
- Pipeline execution history.
- Build status.
- Test results.
- Docker build status.
- Security scan results.
- Deployment status.
- Execution duration.
- Pipeline logs.
- Failure messages.
Users should be able to inspect each pipeline stage.

Use GitHub Actions as the execution engine. OpsPilot should orchestrate and display the results, not pretend to execute CI/CD internally.
Module D: Docker management







homelab.casaursus.net


Features:
- View container images.
- View running containers.
- Display container status.
- Show image tags.
- Display resource usage where available.
- Inspect container logs.
- Track container restarts.
- Show image build history.
For the initial version, retrieve information from the Docker environment using controlled backend integrations.

Never expose unrestricted Docker socket access through a public API.
Module E: Kubernetes management







ikarus.sg


Support local Kubernetes clusters using kind initially.

Features:

Cluster overview
- Cluster name.
- Kubernetes version.
- Node count.
- Cluster health.
Workloads
- Pods.
- Deployments.
- ReplicaSets.
- StatefulSets.
- Services.
Management
- View pod status.
- View events.
- View deployment configuration.
- View resource consumption.
- Scale deployment replicas.
- Restart deployments.
- View failed pods.
- Perform controlled rollbacks.
Configuration
- ConfigMaps.
- Secrets.
- Namespaces.
- Persistent Volumes.
- Ingress.
The backend should interact with Kubernetes through its API using the official Kubernetes Python client.

Implement read-only operations first. Add controlled write operations after authentication, authorization and audit logging are in place.
Module F: Infrastructure as Code







medium.com


Integrate Terraform.

Features:
- Infrastructure project management.
- Terraform configuration files.
- Terraform initialization.
- Terraform validation.
- Terraform plan.
- Terraform apply.
- Terraform destroy.
- Execution history.
- State information.
- Infrastructure change tracking.
Example workflow:
terraform init

terraform validate

terraform plan

terraform apply


Users should be able to inspect the plan before approving infrastructure changes.

Security: Never execute arbitrary Terraform code directly from an unauthenticated API request. Use isolated execution environments, restricted permissions, approval gates and execution logs.

Initially support local Terraform validation and planning. Introduce actual cloud provisioning later.
Module G: Monitoring and observability







pomerium.com


Integrate Prometheus and Grafana.

Monitor:
Metric	Purpose
CPU Usage	Processor consumption
Memory Usage	RAM consumption
Disk Usage	Storage availability
Network Traffic	Incoming/outgoing traffic
Request Rate	Requests per second
Error Rate	Failed requests
Response Latency	Application performance
Container Restarts	Container reliability

Features:
- Infrastructure health dashboard.
- Application health dashboard.
- Historical metrics.
- Custom time ranges.
- Alert configuration.
- Alert history.
Create actual PromQL queries for the metrics.

Example:
rate(http_requests_total[5m])


This calculates the average per-second request rate over the previous five minutes.
Module H: Centralized logging







grafana.com


Use Grafana Loki.

Features:
- Centralized log collection.
- Application logs.
- Container logs.
- Log severity filters.
- Search by service.
- Search by timestamp.
- Error identification.
- Log detail inspection.
Example:
{
  "timestamp": "2026-10-31T10:30:00Z",
  "level": "ERROR",
  "service": "payment-api",
  "message": "Database connection timeout",
  "request_id": "req-123"
}


Support filters:
- INFO
- WARNING
- ERROR
- DEBUG
Allow users to investigate a failed deployment using its associated application logs.
Module I: Infrastructure security
Features:
- User roles and permissions.
- Least-privilege IAM principles.
- Secret management.
- Environment variable management.
- Docker image vulnerability scanning.
- Container security checks.
- Kubernetes RBAC.
- Audit logs.
- Infrastructure change history.
Security scanning tools can include Trivy.

Never display raw secrets in the dashboard. Secrets should be masked, and access should be tightly controlled.
Module J: Incident management
This is a particularly useful feature that makes the platform more than a collection of monitoring screens.

Features:
- Automatically detect configured alert conditions.
- Create incident records.
- Record affected services.
- Record incident timestamps.
- Display related metrics and logs.
- Track investigation status.
- Record resolution details.
- Maintain incident history.
Example:
INCIDENT #001

Service: Payment API

Status: Critical

Issue:
Application error rate exceeded threshold.

Detected:
10:30 AM

Possible evidence:
- Increased HTTP 500 responses
- Database timeout logs
- Increased request latency

Resolution:
Pending investigation


The system should distinguish between an alert and a confirmed root cause. It must not invent diagnoses.
5. Frontend design requirements
The UI should feel like a modern professional infrastructure platform, not a college management system.







terramate.io


Design direction:
- Dark theme as default.
- Professional SaaS dashboard.
- Clean typography.
- Subtle borders.
- Compact information cards.
- Responsive layouts.
- Consistent spacing.
- Lucide icons.
- Clear status indicators.
- Useful empty states and loading states.
Suggested navigation:
OpsPilot
│
├── Overview
│
├── Projects
│   ├── All Projects
│   └── Repositories
│
├── CI/CD
│   ├── Pipelines
│   └── Execution History
│
├── Infrastructure
│   ├── Clusters
│   ├── Workloads
│   ├── Containers
│   └── Terraform
│
├── Observability
│   ├── Metrics
│   ├── Dashboards
│   ├── Logs
│   └── Alerts
│
├── Incidents
│
├── Security
│   ├── Vulnerability Scans
│   ├── Secrets
│   └── Audit Logs
│
└── Settings
    ├── Profile
    ├── Integrations
    └── Team & Access


6. Backend architecture
Keep FastAPI modular.

Suggested structure:
backend/
│
├── app/
│   ├── main.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   └── database.py
│   │
│   ├── models/
│   │
│   ├── schemas/
│   │
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py
│   │       ├── projects.py
│   │       ├── github.py
│   │       ├── pipelines.py
│   │       ├── docker.py
│   │       ├── kubernetes.py
│   │       ├── terraform.py
│   │       ├── monitoring.py
│   │       ├── logs.py
│   │       └── incidents.py
│   │
│   ├── services/
│   │   ├── github_service.py
│   │   ├── pipeline_service.py
│   │   ├── docker_service.py
│   │   ├── kubernetes_service.py
│   │   ├── terraform_service.py
│   │   ├── prometheus_service.py
│   │   └── logging_service.py
│   │
│   ├── workers/
│   │
│   └── utils/
│
├── tests/
├── requirements.txt
└── Dockerfile


Use database migrations, input validation, structured logging and automated tests.

Long-running infrastructure operations should run asynchronously through a controlled worker system, rather than blocking HTTP requests.
7. Database design
Create the following initial entities:
Table	Purpose
users	User accounts
teams	Team management
team_members	User permissions
projects	Registered applications
repositories	GitHub repository information
pipelines	Pipeline definitions
pipeline_runs	Execution history
deployments	Deployment records
clusters	Kubernetes cluster information
incidents	Incident history
alerts	Alert configuration
integrations	External integrations
audit_logs	Security and activity history

Use UUID identifiers, timestamps, relationships and appropriate indexes.
8. Non-functional requirements
These requirements are not optional decorations.
- Every API endpoint must validate authorization.
- No hardcoded credentials.
- No fake monitoring data in production mode.
- Infrastructure operations must be auditable.
- Errors must have meaningful responses.
- Backend services must have health checks.
- Database migrations must be reproducible.
- Docker containers should run with non-root users wherever practical.
- Deployment operations must have timeouts.
- External integrations must handle API failures.
- Application secrets must be managed securely.
- All critical business logic should have automated tests.
9. Development strategy
Do not ask Antigravity to implement everything in one shot. That's how you get a beautiful frontend attached to an imaginary backend.

Build in phases.
Phase	Deliverable	Priority
1	Frontend, backend, authentication, database	Critical
2	GitHub integration and CI/CD	Critical
3	Docker integration	Critical
4	Kubernetes integration	Critical
5	Prometheus and Grafana	Critical
6	Logging with Loki	High
7	Terraform integration	High
8	AWS infrastructure	High
9	Security and incident management	High
10	Ansible and advanced automation	Later

Development rule: Every phase must be functional and tested before proceeding to the next.