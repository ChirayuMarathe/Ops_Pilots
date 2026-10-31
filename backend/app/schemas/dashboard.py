from typing import List, Optional
from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_projects: int
    active_deployments: int
    healthy_services: int
    failed_deployments: int
    infrastructure_status: str  # healthy, degraded, critical, offline
    recent_incidents: int


class RecentActivityItem(BaseModel):
    id: str
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Optional[str] = None
    timestamp: str
    user_name: Optional[str] = None

