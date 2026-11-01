from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import AuditLog, TerraformRun, TerraformWorkspace, User
from app.schemas.terraform import (
    TerraformActionResponse,
    TerraformPlanResponse,
    TerraformRunItem,
    TerraformStateResource,
    WorkspaceCreate,
    WorkspaceResponse,
    WorkspaceUpdate,
)
from app.services.terraform_service import TerraformService

router = APIRouter()


@router.get("/workspaces", response_model=List[WorkspaceResponse])
def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(TerraformWorkspace)
    if not current_user.is_superuser:
        query = query.filter(TerraformWorkspace.owner_id == current_user.id)
    return query.all()


@router.post("/workspaces", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(
    payload: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(TerraformWorkspace).filter(TerraformWorkspace.slug == payload.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"A workspace with slug '{payload.slug}' already exists.")

    workspace = TerraformWorkspace(
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        owner_id=current_user.id,
        status="uninitialized",
        main_tf=payload.main_tf,
        variables_tf=payload.variables_tf,
        requires_approval=payload.requires_approval,
        is_approved=False,
    )
    db.add(workspace)
    db.commit()
    db.refresh(workspace)

    # Sync files to isolated directory
    TerraformService.sync_workspace_files(workspace.id, workspace.main_tf, workspace.variables_tf)

    audit = AuditLog(
        user_id=current_user.id,
        action="TERRAFORM_WORKSPACE_CREATE",
        resource_type="TerraformWorkspace",
        resource_id=workspace.id,
        details=f"Terraform workspace '{workspace.name}' created by {current_user.username}.",
    )
    db.add(audit)
    db.commit()

    return workspace


@router.get("/workspaces/{id}", response_model=WorkspaceResponse)
def get_workspace(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace = db.query(TerraformWorkspace).filter(TerraformWorkspace.id == id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Terraform workspace not found.")
    return workspace


@router.put("/workspaces/{id}", response_model=WorkspaceResponse)
def update_workspace(
    id: str,
    payload: WorkspaceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace = db.query(TerraformWorkspace).filter(TerraformWorkspace.id == id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Terraform workspace not found.")

    if payload.name is not None:
        workspace.name = payload.name
    if payload.description is not None:
        workspace.description = payload.description
    if payload.main_tf is not None:
        workspace.main_tf = payload.main_tf
        # Reset approval when code changes
        workspace.is_approved = False
    if payload.variables_tf is not None:
        workspace.variables_tf = payload.variables_tf
    if payload.requires_approval is not None:
        workspace.requires_approval = payload.requires_approval

    db.commit()
    db.refresh(workspace)

    TerraformService.sync_workspace_files(workspace.id, workspace.main_tf, workspace.variables_tf)
    return workspace


@router.delete("/workspaces/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace = db.query(TerraformWorkspace).filter(TerraformWorkspace.id == id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    db.delete(workspace)
    db.commit()

    TerraformService.delete_workspace_files(id)

    audit = AuditLog(
        user_id=current_user.id,
        action="TERRAFORM_WORKSPACE_DELETE",
        resource_type="TerraformWorkspace",
        resource_id=id,
        details=f"Workspace '{workspace.name}' deleted.",
    )
    db.add(audit)
    db.commit()
    return None


@router.post("/workspaces/{id}/init", response_model=TerraformActionResponse)
def init_workspace(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace = db.query(TerraformWorkspace).filter(TerraformWorkspace.id == id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    TerraformService.sync_workspace_files(workspace.id, workspace.main_tf, workspace.variables_tf)
    res = TerraformService.init(workspace.id)

    workspace.status = "initialized" if res.status == "success" else "failed"
    db.commit()

    run = TerraformRun(
        workspace_id=workspace.id,
        action="init",
        status=res.status,
        exit_code=res.exit_code,
        output_log=res.output,
        initiated_by=current_user.username,
        duration_seconds=res.duration_seconds,
    )
    db.add(run)
    db.commit()

    return res


@router.post("/workspaces/{id}/validate", response_model=TerraformActionResponse)
def validate_workspace(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace = db.query(TerraformWorkspace).filter(TerraformWorkspace.id == id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    res = TerraformService.validate(workspace.id)

    run = TerraformRun(
        workspace_id=workspace.id,
        action="validate",
        status=res.status,
        exit_code=res.exit_code,
        output_log=res.output,
        initiated_by=current_user.username,
        duration_seconds=res.duration_seconds,
    )
    db.add(run)
    db.commit()

    return res


@router.post("/workspaces/{id}/plan", response_model=TerraformPlanResponse)
def plan_workspace(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace = db.query(TerraformWorkspace).filter(TerraformWorkspace.id == id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    res = TerraformService.plan(workspace.id)

    workspace.last_plan_output = res.output
    workspace.resources_to_add = res.resources_to_add
    workspace.resources_to_change = res.resources_to_change
    workspace.resources_to_destroy = res.resources_to_destroy
    workspace.status = "planned" if res.status == "success" else "failed"
    workspace.is_approved = False  # Reset approval on new plan
    db.commit()

    run = TerraformRun(
        workspace_id=workspace.id,
        action="plan",
        status=res.status,
        exit_code=res.exit_code,
        output_log=res.output,
        initiated_by=current_user.username,
        duration_seconds=0,
    )
    db.add(run)
    db.commit()

    return res


@router.post("/workspaces/{id}/approve", response_model=WorkspaceResponse)
def approve_plan(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace = db.query(TerraformWorkspace).filter(TerraformWorkspace.id == id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    if workspace.status != "planned":
        raise HTTPException(
            status_code=400, detail="Cannot approve workspace before a plan is generated."
        )

    workspace.is_approved = True
    workspace.approved_by = current_user.username
    db.commit()
    db.refresh(workspace)

    audit = AuditLog(
        user_id=current_user.id,
        action="TERRAFORM_PLAN_APPROVED",
        resource_type="TerraformWorkspace",
        resource_id=workspace.id,
        details=f"Plan approved by {current_user.username}: +{workspace.resources_to_add}, ~{workspace.resources_to_change}, -{workspace.resources_to_destroy}.",
    )
    db.add(audit)
    db.commit()

    return workspace


@router.post("/workspaces/{id}/apply", response_model=TerraformActionResponse)
def apply_workspace(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace = db.query(TerraformWorkspace).filter(TerraformWorkspace.id == id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    # Strict approval gate check
    if workspace.requires_approval and not workspace.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Terraform apply blocked: Plan approval is required before applying infrastructure changes.",
        )

    res = TerraformService.apply(workspace.id)
    workspace.status = "applied" if res.status == "success" else "failed"
    workspace.is_approved = False  # Reset approval
    db.commit()

    run = TerraformRun(
        workspace_id=workspace.id,
        action="apply",
        status=res.status,
        exit_code=res.exit_code,
        output_log=res.output,
        initiated_by=current_user.username,
        duration_seconds=res.duration_seconds,
    )
    db.add(run)

    audit = AuditLog(
        user_id=current_user.id,
        action="TERRAFORM_APPLY",
        resource_type="TerraformWorkspace",
        resource_id=workspace.id,
        details=f"Terraform apply executed. Status: {res.status}. Duration: {res.duration_seconds}s.",
    )
    db.add(audit)
    db.commit()

    return res


@router.post("/workspaces/{id}/destroy", response_model=TerraformActionResponse)
def destroy_workspace(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace = db.query(TerraformWorkspace).filter(TerraformWorkspace.id == id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    res = TerraformService.destroy(workspace.id)
    workspace.status = "destroyed" if res.status == "success" else "failed"
    workspace.is_approved = False
    db.commit()

    run = TerraformRun(
        workspace_id=workspace.id,
        action="destroy",
        status=res.status,
        exit_code=res.exit_code,
        output_log=res.output,
        initiated_by=current_user.username,
        duration_seconds=res.duration_seconds,
    )
    db.add(run)

    audit = AuditLog(
        user_id=current_user.id,
        action="TERRAFORM_DESTROY",
        resource_type="TerraformWorkspace",
        resource_id=workspace.id,
        details=f"Terraform destroy executed by {current_user.username}.",
    )
    db.add(audit)
    db.commit()

    return res


@router.get("/workspaces/{id}/runs", response_model=List[TerraformRunItem])
def list_workspace_runs(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    runs = (
        db.query(TerraformRun)
        .filter(TerraformRun.workspace_id == id)
        .order_by(TerraformRun.created_at.desc())
        .limit(20)
        .all()
    )
    return runs


@router.get("/workspaces/{id}/state", response_model=List[TerraformStateResource])
def get_workspace_state(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return TerraformService.get_state_resources(id)
