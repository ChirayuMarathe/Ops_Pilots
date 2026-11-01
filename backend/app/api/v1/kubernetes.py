from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import AuditLog, User
from app.schemas.kubernetes import (
    ClusterInfoResponse,
    DeploymentItem,
    K8sEventItem,
    NamespaceItem,
    PodItem,
    PodLogsResponse,
    ScaleDeploymentRequest,
    ServiceItem,
)
from app.services.kubernetes_service import KubernetesService

router = APIRouter()


@router.get("/cluster", response_model=ClusterInfoResponse)
def get_kubernetes_cluster_overview(current_user: User = Depends(get_current_user)):
    return KubernetesService.get_cluster_info()


@router.get("/namespaces", response_model=List[NamespaceItem])
def list_kubernetes_namespaces(current_user: User = Depends(get_current_user)):
    return KubernetesService.list_namespaces()


@router.get("/pods", response_model=List[PodItem])
def list_kubernetes_pods(
    namespace: Optional[str] = Query("all", description="Namespace filter, e.g. default or all"),
    current_user: User = Depends(get_current_user),
):
    return KubernetesService.list_pods(namespace=namespace)


@router.get("/pods/{namespace}/{pod_name}/logs", response_model=PodLogsResponse)
def get_kubernetes_pod_logs(
    namespace: str,
    pod_name: str,
    container: Optional[str] = None,
    tail_lines: int = Query(100, ge=10, le=1000),
    current_user: User = Depends(get_current_user),
):
    return KubernetesService.get_pod_logs(
        namespace=namespace,
        pod_name=pod_name,
        container=container,
        tail_lines=tail_lines,
    )


@router.get("/deployments", response_model=List[DeploymentItem])
def list_kubernetes_deployments(
    namespace: Optional[str] = Query("all", description="Namespace filter"),
    current_user: User = Depends(get_current_user),
):
    return KubernetesService.list_deployments(namespace=namespace)


@router.post("/deployments/{namespace}/{name}/scale")
def scale_kubernetes_deployment(
    namespace: str,
    name: str,
    payload: ScaleDeploymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = KubernetesService.scale_deployment(
        namespace=namespace,
        name=name,
        replicas=payload.replicas,
    )

    audit = AuditLog(
        user_id=current_user.id,
        action="K8S_DEPLOYMENT_SCALE",
        resource_type="Deployment",
        resource_id=f"{namespace}/{name}",
        details=f"Scaled deployment '{name}' in namespace '{namespace}' to {payload.replicas} replicas by {current_user.username}.",
    )
    db.add(audit)
    db.commit()

    return result


@router.post("/deployments/{namespace}/{name}/restart")
def restart_kubernetes_deployment(
    namespace: str,
    name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = KubernetesService.restart_deployment(namespace=namespace, name=name)

    audit = AuditLog(
        user_id=current_user.id,
        action="K8S_DEPLOYMENT_RESTART",
        resource_type="Deployment",
        resource_id=f"{namespace}/{name}",
        details=f"Triggered rolling restart for deployment '{name}' in namespace '{namespace}' by {current_user.username}.",
    )
    db.add(audit)
    db.commit()

    return result


@router.get("/services", response_model=List[ServiceItem])
def list_kubernetes_services(
    namespace: Optional[str] = Query("all", description="Namespace filter"),
    current_user: User = Depends(get_current_user),
):
    return KubernetesService.list_services(namespace=namespace)


@router.get("/events", response_model=List[K8sEventItem])
def list_kubernetes_events(
    namespace: Optional[str] = Query("all", description="Namespace filter"),
    current_user: User = Depends(get_current_user),
):
    return KubernetesService.list_events(namespace=namespace)

