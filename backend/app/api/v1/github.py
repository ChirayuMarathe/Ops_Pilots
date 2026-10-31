import json
from typing import List
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import AuditLog, Integration, Pipeline, PipelineRun, Project, User
from app.schemas.github import (
    GitHubBranchItem,
    GitHubConnectRequest,
    GitHubRepoItem,
    GitHubStatusResponse,
    GitHubWorkflowItem,
)
from app.services.github_service import GitHubService

router = APIRouter()


@router.post("/connect", response_model=GitHubStatusResponse)
async def connect_github(
    payload: GitHubConnectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Validate token against GitHub API
    user_info = await GitHubService.get_user_info(payload.access_token)

    # Check if integration already exists
    integration = (
        db.query(Integration)
        .filter(Integration.user_id == current_user.id, Integration.provider == "github")
        .first()
    )

    if not integration:
        integration = Integration(
            user_id=current_user.id,
            provider="github",
            account_login=user_info["login"],
            account_avatar_url=user_info["avatar_url"],
            access_token=payload.access_token,
            webhook_secret=payload.webhook_secret or "opspilot-webhook-secret-shared",
            scopes=",".join(user_info["scopes"]),
            status="connected",
        )
        db.add(integration)
    else:
        integration.account_login = user_info["login"]
        integration.account_avatar_url = user_info["avatar_url"]
        integration.access_token = payload.access_token
        if payload.webhook_secret:
            integration.webhook_secret = payload.webhook_secret
        integration.scopes = ",".join(user_info["scopes"])
        integration.status = "connected"

    db.commit()
    db.refresh(integration)

    audit = AuditLog(
        user_id=current_user.id,
        action="GITHUB_CONNECTED",
        resource_type="Integration",
        resource_id=integration.id,
        details=f"Connected GitHub account @{user_info['login']} with scopes: {','.join(user_info['scopes'])}",
    )
    db.add(audit)
    db.commit()

    return GitHubStatusResponse(
        is_connected=True,
        login=user_info["login"],
        avatar_url=user_info["avatar_url"],
        scopes=user_info["scopes"],
        status="connected",
    )


@router.get("/status", response_model=GitHubStatusResponse)
def get_github_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    integration = (
        db.query(Integration)
        .filter(Integration.user_id == current_user.id, Integration.provider == "github")
        .first()
    )
    if not integration or integration.status != "connected":
        return GitHubStatusResponse(is_connected=False, status="disconnected")

    scopes = [s.strip() for s in integration.scopes.split(",") if s.strip()] if integration.scopes else []
    return GitHubStatusResponse(
        is_connected=True,
        login=integration.account_login,
        avatar_url=integration.account_avatar_url,
        scopes=scopes,
        status="connected",
    )


@router.delete("/disconnect", status_code=status.HTTP_204_NO_CONTENT)
def disconnect_github(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    integration = (
        db.query(Integration)
        .filter(Integration.user_id == current_user.id, Integration.provider == "github")
        .first()
    )
    if integration:
        db.delete(integration)
        db.commit()

        audit = AuditLog(
            user_id=current_user.id,
            action="GITHUB_DISCONNECTED",
            resource_type="Integration",
            resource_id=integration.id,
            details="Disconnected GitHub account.",
        )
        db.add(audit)
        db.commit()

    return None


@router.get("/repos", response_model=List[GitHubRepoItem])
async def list_github_repositories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    integration = (
        db.query(Integration)
        .filter(Integration.user_id == current_user.id, Integration.provider == "github")
        .first()
    )
    if not integration or integration.status != "connected":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub is not connected. Please connect your GitHub account in Settings or Integrations.",
        )

    repos = await GitHubService.list_repositories(integration.access_token)
    return repos


@router.get("/repos/{owner}/{repo}/branches", response_model=List[GitHubBranchItem])
async def list_repository_branches(
    owner: str,
    repo: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    integration = (
        db.query(Integration)
        .filter(Integration.user_id == current_user.id, Integration.provider == "github")
        .first()
    )
    if not integration or integration.status != "connected":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub is not connected.",
        )

    branches = await GitHubService.list_branches(integration.access_token, owner, repo)
    return branches


@router.get("/repos/{owner}/{repo}/workflows", response_model=List[GitHubWorkflowItem])
async def list_repository_workflows(
    owner: str,
    repo: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    integration = (
        db.query(Integration)
        .filter(Integration.user_id == current_user.id, Integration.provider == "github")
        .first()
    )
    if not integration or integration.status != "connected":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub is not connected.",
        )

    workflows = await GitHubService.list_workflows(integration.access_token, owner, repo)
    return workflows


@router.post("/webhooks", status_code=status.HTTP_200_OK)
async def github_webhook_handler(
    request: Request,
    x_github_event: str = Header(..., alias="X-GitHub-Event"),
    x_hub_signature_256: str = Header(None, alias="X-Hub-Signature-256"),
    db: Session = Depends(get_db),
):
    """
    Public GitHub webhook endpoint.
    Verifies HMAC SHA-256 signature and records pipeline events.
    """
    body_bytes = await request.body()

    # Look up any active integration webhook secret
    integration = db.query(Integration).filter(Integration.provider == "github").first()
    secret = integration.webhook_secret if integration else "opspilot-webhook-secret-shared"

    # Verify signature if header is present
    if x_hub_signature_256:
        is_valid = GitHubService.verify_webhook_signature(body_bytes, x_hub_signature_256, secret)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature (HMAC-SHA256 mismatch)."
            )

    try:
        payload = json.loads(body_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    # Process workflow_run events
    if x_github_event == "workflow_run":
        action = payload.get("action")
        workflow_run = payload.get("workflow_run", {})
        run_id = str(workflow_run.get("id"))
        repo_name = payload.get("repository", {}).get("name")
        workflow_id = str(workflow_run.get("workflow_id"))

        # Find matching pipeline run
        run_record = db.query(PipelineRun).filter(PipelineRun.github_run_id == run_id).first()
        if run_record:
            run_record.status = workflow_run.get("status", run_record.status)
            run_record.conclusion = workflow_run.get("conclusion")
            db.commit()

        audit = AuditLog(
            action="GITHUB_WEBHOOK_WORKFLOW_RUN",
            resource_type="PipelineRun",
            resource_id=run_id,
            details=f"Received GitHub Actions workflow_run '{action}' event for repo '{repo_name}'. Status: {workflow_run.get('status')}",
        )
        db.add(audit)
        db.commit()

    return {"status": "processed", "event": x_github_event}
