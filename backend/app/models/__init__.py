import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, Integer, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(String(50), default="developer", nullable=False)  # admin, devops, developer, viewer
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")
    integrations = relationship("Integration", back_populates="user", cascade="all, delete-orphan")


class Team(Base):
    __tablename__ = "teams"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    name = Column(String(100), index=True, nullable=False)
    slug = Column(String(120), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    repository_url = Column(String(255), nullable=True)
    default_branch = Column(String(100), default="main", nullable=False)
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="active", nullable=False)  # active, archived, pending
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    owner = relationship("User", back_populates="projects")
    pipelines = relationship("Pipeline", back_populates="project", cascade="all, delete-orphan")
    deployments = relationship("Deployment", back_populates="project", cascade="all, delete-orphan")


class Pipeline(Base):
    __tablename__ = "pipelines"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    workflow_file = Column(String(255), nullable=False)  # e.g., .github/workflows/deploy.yml or deploy.yml
    workflow_id = Column(String(100), nullable=True)     # GitHub workflow ID
    trigger_type = Column(String(50), default="push")   # push, pull_request, manual
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    project = relationship("Project", back_populates="pipelines")
    runs = relationship("PipelineRun", back_populates="pipeline", cascade="all, delete-orphan")


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    pipeline_id = Column(String(36), ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False)
    github_run_id = Column(String(100), index=True, nullable=True)
    run_number = Column(Integer, nullable=False)
    status = Column(String(50), default="queued")  # queued, in_progress, success, failure, cancelled
    conclusion = Column(String(50), nullable=True)  # success, failure, cancelled, timed_out
    commit_hash = Column(String(40), nullable=True)
    commit_message = Column(Text, nullable=True)
    branch = Column(String(100), nullable=True)
    triggered_by = Column(String(100), nullable=True)
    html_url = Column(String(500), nullable=True)
    stages_data = Column(JSON, nullable=True)  # [{name, status, conclusion, started_at, completed_at, steps: [...]}]
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    logs = Column(Text, nullable=True)

    pipeline = relationship("Pipeline", back_populates="runs")


class Integration(Base):
    __tablename__ = "integrations"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), default="github", nullable=False)  # github, aws, docker
    account_login = Column(String(100), nullable=True)
    account_avatar_url = Column(String(500), nullable=True)
    access_token = Column(String(500), nullable=False)
    webhook_secret = Column(String(255), nullable=True)
    scopes = Column(String(255), nullable=True)
    status = Column(String(50), default="connected", nullable=False)  # connected, revoked, expired
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="integrations")


class Cluster(Base):
    __tablename__ = "clusters"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    name = Column(String(100), unique=True, nullable=False)
    cluster_type = Column(String(50), default="kind")  # kind, eks, minikube, generic
    endpoint = Column(String(255), nullable=True)
    version = Column(String(50), nullable=True)
    status = Column(String(50), default="unknown")  # healthy, warning, critical, offline
    node_count = Column(Integer, default=1)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    deployments = relationship("Deployment", back_populates="cluster")


class Deployment(Base):
    __tablename__ = "deployments"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    cluster_id = Column(String(36), ForeignKey("clusters.id", ondelete="SET NULL"), nullable=True)
    environment = Column(String(50), default="production")  # production, staging, dev
    image_tag = Column(String(255), nullable=False)
    status = Column(String(50), default="pending")  # pending, deploying, deployed, failed, rolled_back
    replicas = Column(Integer, default=1)
    deployed_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    project = relationship("Project", back_populates="deployments")
    cluster = relationship("Cluster", back_populates="deployments")


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    title = Column(String(255), nullable=False)
    service_name = Column(String(100), nullable=False)
    severity = Column(String(50), default="medium")  # critical, high, medium, low
    status = Column(String(50), default="open")      # open, investigating, resolved, closed
    detected_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    description = Column(Text, nullable=True)
    root_cause = Column(Text, nullable=True)
    resolution_notes = Column(Text, nullable=True)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    name = Column(String(100), nullable=False)
    metric_name = Column(String(100), nullable=False)
    condition = Column(String(50), nullable=False)  # gt, lt, eq
    threshold = Column(String(50), nullable=False)
    duration = Column(String(50), default="5m")
    severity = Column(String(50), default="warning")
    is_enabled = Column(Boolean, default=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(255), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    user = relationship("User", back_populates="audit_logs")


class TerraformWorkspace(Base):
    __tablename__ = "terraform_workspaces"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    name = Column(String(100), index=True, nullable=False)
    slug = Column(String(120), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="uninitialized", nullable=False)  # uninitialized, initialized, planned, applied, failed
    main_tf = Column(Text, nullable=False)
    variables_tf = Column(Text, nullable=True)
    last_plan_output = Column(Text, nullable=True)
    resources_to_add = Column(Integer, default=0)
    resources_to_change = Column(Integer, default=0)
    resources_to_destroy = Column(Integer, default=0)
    requires_approval = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=False)
    approved_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    runs = relationship("TerraformRun", back_populates="workspace", cascade="all, delete-orphan")


class TerraformRun(Base):
    __tablename__ = "terraform_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    workspace_id = Column(String(36), ForeignKey("terraform_workspaces.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(50), nullable=False)  # init, validate, plan, apply, destroy
    status = Column(String(50), default="running")  # running, success, failure
    exit_code = Column(Integer, nullable=True)
    output_log = Column(Text, nullable=True)
    initiated_by = Column(String(100), nullable=True)
    duration_seconds = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    workspace = relationship("TerraformWorkspace", back_populates="runs")

