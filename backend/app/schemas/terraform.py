from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class WorkspaceBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(..., min_length=2, max_length=120)
    description: Optional[str] = None
    main_tf: str = Field(..., min_length=5, description="Terraform HCL configuration")
    variables_tf: Optional[str] = None
    requires_approval: bool = True


class WorkspaceCreate(WorkspaceBase):
    pass


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    main_tf: Optional[str] = None
    variables_tf: Optional[str] = None
    requires_approval: Optional[bool] = None


class WorkspaceResponse(WorkspaceBase):
    id: str
    owner_id: str
    status: str
    last_plan_output: Optional[str] = None
    resources_to_add: int = 0
    resources_to_change: int = 0
    resources_to_destroy: int = 0
    is_approved: bool = False
    approved_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TerraformActionResponse(BaseModel):
    workspace_id: str
    action: str
    status: str  # success, failure
    exit_code: int
    output: str
    duration_seconds: int = 0


class TerraformPlanResponse(BaseModel):
    workspace_id: str
    status: str
    exit_code: int
    output: str
    resources_to_add: int
    resources_to_change: int
    resources_to_destroy: int
    requires_approval: bool
    is_approved: bool


class TerraformRunItem(BaseModel):
    id: str
    workspace_id: str
    action: str
    status: str
    exit_code: Optional[int] = None
    output_log: Optional[str] = None
    initiated_by: Optional[str] = None
    duration_seconds: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TerraformStateResource(BaseModel):
    address: str
    resource_type: str
    name: str
