from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class PipelineBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    workflow_file: str = Field(min_length=1, description="Path to workflow file, e.g., deploy.yml")
    workflow_id: Optional[str] = None
    trigger_type: str = "push"
    is_active: bool = True


class PipelineCreate(PipelineBase):
    project_id: str


class PipelineResponse(PipelineBase):
    id: str
    project_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PipelineTriggerRequest(BaseModel):
    branch: str = "main"
    inputs: Optional[Dict[str, Any]] = None


class StageStep(BaseModel):
    name: str
    status: str
    conclusion: Optional[str] = None
    number: Optional[int] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class PipelineStage(BaseModel):
    id: str
    name: str
    status: str
    conclusion: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    steps: List[StageStep] = []


class PipelineRunResponse(BaseModel):
    id: str
    pipeline_id: str
    github_run_id: Optional[str] = None
    run_number: int
    status: str
    conclusion: Optional[str] = None
    commit_hash: Optional[str] = None
    commit_message: Optional[str] = None
    branch: Optional[str] = None
    triggered_by: Optional[str] = None
    html_url: Optional[str] = None
    stages_data: Optional[List[Dict[str, Any]]] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

