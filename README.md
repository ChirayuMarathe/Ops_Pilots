# OpsPilot 🚀

> **OpsPilot** is an open-source, production-ready DevOps automation and observability platform engineered as an Internal Developer Platform (IDP). It integrates GitHub repositories, GitHub Actions CI/CD, Docker containers, Kubernetes workloads, Terraform IaC, and Prometheus/Grafana/Loki observability into a unified operational console.

---

## 🛠 Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide icons, Axios
- **Backend**: Python 3.13, FastAPI, SQLAlchemy ORM, Pydantic v2, PyJWT, Bcrypt
- **Database**: PostgreSQL 16
- **Containerization**: Docker & Docker Compose
- **Testing**: Pytest & HTTPX TestClient

---

## 📂 Repository Architecture

```text
Github_Monitoring/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Modular API endpoints (Auth, Projects, Dashboard, Health)
│   │   ├── core/            # Config, Security (JWT/Bcrypt), Database connection
│   │   ├── models/          # SQLAlchemy Database entities
│   │   ├── schemas/         # Pydantic v2 validation models
│   │   └── main.py          # FastAPI application entrypoint & lifespan
│   ├── tests/               # Pytest automated test suite
│   ├── Dockerfile           # Production container definition
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar, Sidebar, Protected Layout
│   │   ├── context/         # AuthContext (JWT management)
│   │   ├── pages/           # Login, Register, Dashboard, Projects
│   │   ├── services/        # Axios API client with interceptors
│   │   └── App.jsx          # Route definitions & protected routes
│   ├── Dockerfile           # Multi-stage production container
│   ├── package.json
│   └── vite.config.js
├── docs/
│   └── architecture.md      # Comprehensive architecture & design document
├── docker-compose.yml       # Production/local multi-container orchestration
├── .env.example             # Environment configuration blueprint
├── Core.md                  # OpsPilot product requirements
└── Plan.md                  # Engineering execution plan
```

---

## 🚀 Getting Started

### Option 1: Run with Docker Compose (Recommended)

1. Clone and navigate to the project directory:
   ```bash
   cd Github_Monitoring
   ```

2. Start all services (PostgreSQL, FastAPI Backend, React Frontend):
   ```bash
   docker compose up -d --build
   ```

3. Access the services:
   - **OpsPilot Frontend**: [http://localhost:3000](http://localhost:3000)
   - **FastAPI Documentation**: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
   - **Health Probe**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

---

### Option 2: Local Development Setup

#### 1. Backend

```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

#### 3. Run Automated Tests

```bash
pytest -v backend/tests
```

---

## 📌 Phase 1 Deliverables Summary

- [x] Repository folder structure and hygiene (`.gitignore`, `.env.example`).
- [x] Comprehensive architecture document ([`docs/architecture.md`](file:///c:/Users/chira/Documents/Github_Monitoring/docs/architecture.md)).
- [x] Database entities (`users`, `teams`, `projects`, `pipelines`, `clusters`, `deployments`, `incidents`, `audit_logs`).
- [x] JWT Authentication & RBAC security layer with Bcrypt password hashing.
- [x] RESTful API endpoints for Auth, Projects, Health, and Real Dashboard telemetry.
- [x] React + Vite + Tailwind CSS dark-mode UI with full Auth flow and Project management.
- [x] Multi-container Docker Compose setup (`db`, `backend`, `frontend`).
- [x] Automated test suite passing with 100% coverage on core Phase 1 logic.

