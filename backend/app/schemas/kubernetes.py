from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class NodeItem(BaseModel):
    name: str
    status: str
    roles: List[str] = []
    version: str
    os_image: str
    cpu_capacity: str
    memory_capacity: str


class ClusterInfoResponse(BaseModel):
    is_connected: bool
    cluster_name: Optional[str] = None
    server_version: Optional[str] = None
    node_count: int = 0
    nodes: List[NodeItem] = []
    status: str = "offline"  # healthy, degraded, critical, offline
    error: Optional[str] = None


class NamespaceItem(BaseModel):
    name: str
    status: str
    created_at: str


class PodItem(BaseModel):
    name: str
    namespace: str
    phase: str
    status: str
    ready_containers: str
    restarts: int
    ip: Optional[str] = None
    node: Optional[str] = None
    created_at: str
    images: List[str] = []


class DeploymentItem(BaseModel):
    name: str
    namespace: str
    replicas: int
    ready_replicas: int
    up_to_date_replicas: int
    available_replicas: int
    images: List[str] = []
    created_at: str


class ScaleDeploymentRequest(BaseModel):
    replicas: int = Field(..., ge=0, le=50, description="Target replica count")


class ServiceItem(BaseModel):
    name: str
    namespace: str
    service_type: str
    cluster_ip: Optional[str] = None
    external_ip: Optional[str] = None
    ports: List[str] = []


class K8sEventItem(BaseModel):
    event_type: str
    reason: str
    message: str
    involved_object: str
    timestamp: str


class PodLogsResponse(BaseModel):
    pod_name: str
    namespace: str
    container: Optional[str] = None
    tail_lines: int
    logs: str
