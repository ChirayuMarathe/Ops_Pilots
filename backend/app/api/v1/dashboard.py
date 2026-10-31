from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Project, Deployment, Cluster, Incident, AuditLog, User
from app.schemas.dashboard import DashboardSummary, RecentActivityItem

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Total projects belonging to user (or all if superuser)
    if current_user.is_superuser:
        total_projects = db.query(Project).count()
        active_deployments = db.query(Deployment).filter(Deployment.status == "deployed").count()
        failed_deployments = db.query(Deployment).filter(Deployment.status == "failed").count()
        healthy_services = db.query(Deployment).filter(Deployment.status == "deployed").count()
        recent_incidents = db.query(Incident).filter(Incident.status.in_(["open", "investigating"])).count()
    else:
        user_project_ids = [p.id for p in db.query(Project.id).filter(Project.owner_id == current_user.id).all()]
        total_projects = len(user_project_ids)
        active_deployments = db.query(Deployment).filter(
            Deployment.project_id.in_(user_project_ids), Deployment.status == "deployed"
        ).count() if user_project_ids else 0
        failed_deployments = db.query(Deployment).filter(
            Deployment.project_id.in_(user_project_ids), Deployment.status == "failed"
        ).count() if user_project_ids else 0
        healthy_services = active_deployments
        recent_incidents = db.query(Incident).filter(Incident.status.in_(["open", "investigating"])).count()

    # Determine infrastructure status from cluster records
    clusters = db.query(Cluster).all()
    if not clusters:
        infra_status = "unconfigured"
    elif any(c.status == "critical" for c in clusters):
        infra_status = "critical"
    elif any(c.status == "warning" for c in clusters):
        infra_status = "degraded"
    elif all(c.status == "healthy" for c in clusters):
        infra_status = "healthy"
    else:
        infra_status = "ready"

    return DashboardSummary(
        total_projects=total_projects,
        active_deployments=active_deployments,
        healthy_services=healthy_services,
        failed_deployments=failed_deployments,
        infrastructure_status=infra_status,
        recent_incidents=recent_incidents
    )


@router.get("/activity", response_model=List[RecentActivityItem])
def get_recent_activity(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog, User.username).outerjoin(User, AuditLog.user_id == User.id)
    if not current_user.is_superuser:
        query = query.filter(AuditLog.user_id == current_user.id)
    
    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()

    activity = []
    for log, username in logs:
        activity.append(
            RecentActivityItem(
                id=log.id,
                action=log.action,
                resource_type=log.resource_type,
                resource_id=log.resource_id,
                details=log.details,
                timestamp=log.created_at.isoformat(),
                user_name=username or "System"
            )
        )
    return activity

