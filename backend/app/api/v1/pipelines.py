from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import AuditLog, Integration, Pipeline, PipelineRun, Project, User
from app.schemas.pipeline import (
    PipelineCreate,
    PipelineResponse,
    PipelineRunResponse,
    PipelineTriggerRequest,
)
from app.services.github_service import GitHubService

router = APIRouter()


@router.get("", response_model=List[PipelineResponse])
def list_pipelines(
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Pipeline)
        .join(Project, Pipeline.project_id == Project.id)
        .filter(Project.owner_id == current_user.id)
    )
    if project_id:
        query = query.filter(Pipeline.project_id == project_id)

    return query.all()


@router.post("", response_model=PipelineResponse, status_code=status.HTTP_201_CREATED)
def create_pipeline(
    pipeline_in: PipelineCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == pipeline_in.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    if project.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized to manage this project.")

    pipeline = Pipeline(
        project_id=pipeline_in.project_id,
        name=pipeline_in.name,
        workflow_file=pipeline_in.workflow_file,
        workflow_id=pipeline_in.workflow_id,
        trigger_type=pipeline_in.trigger_type,
        is_active=pipeline_in.is_active,
    )
    db.add(pipeline)
    db.commit()
    db.refresh(pipeline)

    audit = AuditLog(
        user_id=current_user.id,
        action="PIPELINE_CREATE",
        resource_type="Pipeline",
        resource_id=pipeline.id,
        details=f"Pipeline '{pipeline.name}' created for project '{project.name}'.",
    )
    db.add(audit)
    db.commit()

    return pipeline


@router.get("/{pipeline_id}", response_model=PipelineResponse)
def get_pipeline(
    pipeline_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found.")
    return pipeline


@router.post("/{pipeline_id}/trigger", response_model=PipelineRunResponse)
async def trigger_pipeline(
    pipeline_id: str,
    trigger_in: PipelineTriggerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found.")

    project = pipeline.project
    if project.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized to trigger this pipeline.")

    # Get GitHub integration
    integration = (
        db.query(Integration)
        .filter(Integration.user_id == current_user.id, Integration.provider == "github")
        .first()
    )

    # Determine next run number
    last_run = (
        db.query(PipelineRun)
        .filter(PipelineRun.pipeline_id == pipeline.id)
        .order_by(PipelineRun.run_number.desc())
        .first()
    )
    next_run_number = (last_run.run_number + 1) if last_run else 1

    # If GitHub repo and token are configured, trigger dispatch
    github_triggered = False
    html_url = None
    if integration and project.repository_url:
        try:
            # Parse owner/repo from https://github.com/owner/repo or owner/repo
            cleaned_url = project.repository_url.rstrip("/").replace(".git", "")
            parts = cleaned_url.split("/")
            if len(parts) >= 2:
                owner, repo = parts[-2], parts[-1]
                workflow_target = pipeline.workflow_id or pipeline.workflow_file
                github_triggered = await GitHubService.trigger_workflow(
                    token=integration.access_token,
                    owner=owner,
                    repo=repo,
                    workflow_id=workflow_target,
                    ref=trigger_in.branch,
                    inputs=trigger_in.inputs,
                )
                html_url = f"https://github.com/{owner}/{repo}/actions"
        except Exception as e:
            # If GitHub API call fails, raise HTTPException
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to dispatch GitHub Actions workflow: {str(e)}"
            )

    # Initial mock/standard stage pipeline definition for IDP visualization
    initial_stages = [
        {"name": "Run Tests", "status": "in_progress", "conclusion": None, "steps": [
            {"name": "Checkout code", "status": "completed", "conclusion": "success"},
            {"name": "Setup Python / Node", "status": "completed", "conclusion": "success"},
            {"name": "Execute test suite", "status": "in_progress", "conclusion": None},
        ]},
        {"name": "Build Docker Image", "status": "queued", "conclusion": None, "steps": []},
        {"name": "Security Scan (Trivy)", "status": "queued", "conclusion": None, "steps": []},
        {"name": "Deploy to Kubernetes", "status": "queued", "conclusion": None, "steps": []},
        {"name": "Verify Deployment", "status": "queued", "conclusion": None, "steps": []},
    ]

    run = PipelineRun(
        pipeline_id=pipeline.id,
        run_number=next_run_number,
        status="in_progress",
        conclusion=None,
        branch=trigger_in.branch,
        triggered_by=current_user.username,
        started_at=datetime.now(timezone.utc),
        html_url=html_url,
        stages_data=initial_stages,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    audit = AuditLog(
        user_id=current_user.id,
        action="PIPELINE_TRIGGER",
        resource_type="PipelineRun",
        resource_id=run.id,
        details=f"Pipeline '{pipeline.name}' run #{run.run_number} triggered on branch '{trigger_in.branch}' by {current_user.username}.",
    )
    db.add(audit)
    db.commit()

    return run


@router.get("/{pipeline_id}/runs", response_model=List[PipelineRunResponse])
def list_pipeline_runs(
    pipeline_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found.")

    runs = (
        db.query(PipelineRun)
        .filter(PipelineRun.pipeline_id == pipeline_id)
        .order_by(PipelineRun.run_number.desc())
        .all()
    )
    return runs


@router.get("/runs/{run_id}", response_model=PipelineRunResponse)
def get_pipeline_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    run = db.query(PipelineRun).filter(PipelineRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Pipeline run not found.")
    return run


@router.post("/runs/{run_id}/sync", response_model=PipelineRunResponse)
async def sync_pipeline_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    run = db.query(PipelineRun).filter(PipelineRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Pipeline run not found.")

    pipeline = run.pipeline
    project = pipeline.project

    integration = (
        db.query(Integration)
        .filter(Integration.user_id == current_user.id, Integration.provider == "github")
        .first()
    )

    if integration and project.repository_url and run.github_run_id:
        cleaned_url = project.repository_url.rstrip("/").replace(".git", "")
        parts = cleaned_url.split("/")
        if len(parts) >= 2:
            owner, repo = parts[-2], parts[-1]
            jobs = await GitHubService.get_workflow_run_jobs(
                token=integration.access_token,
                owner=owner,
                repo=repo,
                run_id=run.github_run_id,
            )
            if jobs:
                run.stages_data = jobs
                # If all jobs completed successfully, update run status
                if all(j.get("status") == "completed" and j.get("conclusion") == "success" for j in jobs):
                    run.status = "completed"
                    run.conclusion = "success"
                elif any(j.get("conclusion") == "failure" for j in jobs):
                    run.status = "completed"
                    run.conclusion = "failure"
                db.commit()
                db.refresh(run)

    return run
