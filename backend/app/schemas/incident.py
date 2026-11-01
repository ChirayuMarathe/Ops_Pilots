from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class IncidentBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    service_name: str = Field(..., min_length=2, max_length=100)
    severity: str = Field("medium", pattern="^(critical|high|medium|low)$")
    description: Optional[str] = None
    assigned_to: Optional[str] = None


class IncidentCreate(IncidentBase):
    pass


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    severity: Optional[str] = Field(None, pattern="^(critical|high|medium|low)$")
    status: Optional[str] = Field(None, pattern="^(open|investigating|mitigated|resolved|closed)$")
    assigned_to: Optional[str] = None
    root_cause: Optional[str] = None
    resolution_notes: Optional[str] = None


class IncidentResponse(IncidentBase):
    id: str
    status: str
    detected_at: datetime
    resolved_at: Optional[datetime] = None
    root_cause: Optional[str] = None
    resolution_notes: Optional[str] = None
    evidence_metrics: Optional[str] = None
    evidence_logs: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AlertBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    metric_name: str = Field(..., min_length=2, max_length=100)
    condition: str = Field(..., pattern="^(gt|lt|eq)$")
    threshold: str = Field(...)
    duration: str = Field("5m")
    severity: str = Field("warning", pattern="^(critical|warning|info)$")
    is_enabled: bool = True


class AlertCreate(AlertBase):
    pass


class AlertResponse(AlertBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


class AlertEvaluationResult(BaseModel):
    alert_id: str
    alert_name: str
    metric_value: float
    threshold_value: float
    is_breached: bool
    incident_created: Optional[str] = None
    evaluated_at: datetime


class IncidentSummary(BaseModel):
    total_active: int
    critical_count: int
    high_count: int
    mean_time_to_resolve_minutes: float
    recent_incidents: List[IncidentResponse]

