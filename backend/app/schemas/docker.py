from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DockerStatusResponse(BaseModel):
    is_available: bool
    server_version: Optional[str] = None
    operating_system: Optional[str] = None
    containers_total: int = 0
    containers_running: int = 0
    containers_paused: int = 0
    containers_stopped: int = 0
    images_total: int = 0
    error: Optional[str] = None


class ContainerItem(BaseModel):
    id: str
    short_id: str
    name: str
    image: str
    image_tag: str
    status: str
    state: str
    created_at: str
    ports: Dict[str, Any] = {}
    restart_count: int = 0


class ContainerDetail(BaseModel):
    id: str
    short_id: str
    name: str
    image: str
    status: str
    state: str
    created_at: str
    restart_count: int
    command: Optional[str] = None
    ip_address: Optional[str] = None
    ports: Dict[str, Any] = {}
    env_vars: List[str] = []
    mounts: List[Dict[str, Any]] = []


class ContainerStats(BaseModel):
    container_id: str
    cpu_percent: float
    memory_usage_mb: float
    memory_limit_mb: float
    memory_percent: float
    pids: int = 0


class ContainerLogs(BaseModel):
    container_id: str
    tail: int
    logs: str


class ContainerActionRequest(BaseModel):
    action: str = Field(..., pattern="^(start|stop|restart)$", description="Must be start, stop, or restart")


class DockerImageItem(BaseModel):
    id: str
    short_id: str
    repository: str
    tag: str
    size_mb: float
    created_at: str
