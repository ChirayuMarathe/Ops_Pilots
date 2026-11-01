import re
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Project, User, AuditLog
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter()


@router.get("", response_model=List[ProjectResponse])
def list_projects(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    projects = db.query(Project).filter(Project.owner_id == current_user.id).offset(skip).limit(limit).all()
    return projects


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Auto-generate slug if missing or blank
    slug = (project_in.slug or "").strip().lower()
    if not slug:
        slug = re.sub(r"[^a-z0-9]+", "-", project_in.name.lower()).strip("-") or "project"

    # Check slug uniqueness
    existing = db.query(Project).filter(Project.slug == slug).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A project with slug '{slug}' already exists."
        )

    project = Project(
        name=project_in.name,
        slug=slug,
        description=project_in.description,
        repository_url=project_in.repository_url,
        default_branch=project_in.default_branch or "main",
        owner_id=current_user.id,
        status="active"
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    audit = AuditLog(
        user_id=current_user.id,
        action="PROJECT_CREATE",
        resource_type="Project",
        resource_id=project.id,
        details=f"Project '{project.name}' created by {current_user.username}."
    )
    db.add(audit)
    db.commit()

    return project


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    
    if project.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this project.")

    db.delete(project)
    db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="PROJECT_DELETE",
        resource_type="Project",
        resource_id=project_id,
        details=f"Project '{project.name}' deleted."
    )
    db.add(audit)
    db.commit()

    return None

