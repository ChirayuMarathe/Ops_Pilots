from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import AuditLog, User
from app.schemas.docker import (
    ContainerActionRequest,
    ContainerDetail,
    ContainerItem,
    ContainerLogs,
    ContainerStats,
    DockerImageItem,
    DockerStatusResponse,
)
from app.services.docker_service import DockerService

router = APIRouter()


@router.get("/status", response_model=DockerStatusResponse)
def get_docker_engine_status(current_user: User = Depends(get_current_user)):
    return DockerService.get_status()


@router.get("/containers", response_model=List[ContainerItem])
def list_containers(
    all: bool = Query(True, description="Include stopped containers"),
    current_user: User = Depends(get_current_user),
):
    return DockerService.list_containers(all=all)


@router.get("/containers/{container_id}", response_model=ContainerDetail)
def get_container_details(
    container_id: str,
    current_user: User = Depends(get_current_user),
):
    return DockerService.get_container_details(container_id)


@router.get("/containers/{container_id}/stats", response_model=ContainerStats)
def get_container_resource_stats(
    container_id: str,
    current_user: User = Depends(get_current_user),
):
    return DockerService.get_container_stats(container_id)


@router.get("/containers/{container_id}/logs", response_model=ContainerLogs)
def get_container_logs(
    container_id: str,
    tail: int = Query(100, ge=10, le=1000),
    current_user: User = Depends(get_current_user),
):
    return DockerService.get_container_logs(container_id, tail=tail)


@router.post("/containers/{container_id}/action")
def execute_container_action(
    container_id: str,
    payload: ContainerActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = DockerService.execute_action(container_id, payload.action)

    audit = AuditLog(
        user_id=current_user.id,
        action=f"CONTAINER_{payload.action.upper()}",
        resource_type="Container",
        resource_id=container_id,
        details=f"Container '{result.get('name')}' executed action '{payload.action}' by user {current_user.username}.",
    )
    db.add(audit)
    db.commit()

    return result


@router.get("/images", response_model=List[DockerImageItem])
def list_docker_images(current_user: User = Depends(get_current_user)):
    return DockerService.list_images()

