import math
from typing import Any, Dict, List, Optional
import docker
from docker.errors import DockerException, NotFound, APIError
from fastapi import HTTPException, status

from app.schemas.docker import (
    ContainerActionRequest,
    ContainerDetail,
    ContainerItem,
    ContainerLogs,
    ContainerStats,
    DockerImageItem,
    DockerStatusResponse,
)


class DockerService:
    @staticmethod
    def get_client() -> Optional[docker.DockerClient]:
        try:
            return docker.from_env()
        except DockerException:
            return None

    @classmethod
    def get_status(cls) -> DockerStatusResponse:
        client = cls.get_client()
        if not client:
            return DockerStatusResponse(
                is_available=False,
                error="Docker daemon is not reachable or not running on this host."
            )

        try:
            info = client.info()
            return DockerStatusResponse(
                is_available=True,
                server_version=info.get("ServerVersion"),
                operating_system=info.get("OperatingSystem"),
                containers_total=info.get("Containers", 0),
                containers_running=info.get("ContainersRunning", 0),
                containers_paused=info.get("ContainersPaused", 0),
                containers_stopped=info.get("ContainersStopped", 0),
                images_total=info.get("Images", 0),
            )
        except Exception as e:
            return DockerStatusResponse(
                is_available=False,
                error=f"Error querying Docker daemon info: {str(e)}"
            )

    @classmethod
    def list_containers(cls, all: bool = True) -> List[ContainerItem]:
        client = cls.get_client()
        if not client:
            return []

        try:
            containers = client.containers.list(all=all)
            results = []
            for c in containers:
                tags = c.image.tags if c.image and c.image.tags else []
                image_tag = tags[0] if tags else (c.attrs.get("Config", {}).get("Image", "unknown"))
                image_name = image_tag.split(":")[0] if ":" in image_tag else image_tag

                # Ports mapping
                ports = c.attrs.get("NetworkSettings", {}).get("Ports", {}) or {}

                # Restart count
                restart_count = c.attrs.get("RestartCount", 0)

                results.append(
                    ContainerItem(
                        id=c.id,
                        short_id=c.short_id,
                        name=c.name.lstrip("/"),
                        image=image_name,
                        image_tag=image_tag,
                        status=c.status,
                        state=c.attrs.get("State", {}).get("Status", c.status),
                        created_at=c.attrs.get("Created", ""),
                        ports=ports,
                        restart_count=restart_count,
                    )
                )
            return results
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Docker error: {str(e)}"
            )

    @classmethod
    def get_container_details(cls, container_id: str) -> ContainerDetail:
        client = cls.get_client()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Docker daemon is offline."
            )

        try:
            c = client.containers.get(container_id)
            attrs = c.attrs
            cfg = attrs.get("Config", {})
            net = attrs.get("NetworkSettings", {})

            # Filter env vars for safety (mask passwords/tokens)
            raw_env = cfg.get("Env", []) or []
            masked_env = []
            for e in raw_env:
                if "=" in e:
                    k, v = e.split("=", 1)
                    if any(secret_term in k.lower() for secret_term in ["secret", "key", "password", "token"]):
                        masked_env.append(f"{k}=********")
                    else:
                        masked_env.append(f"{k}={v}")
                else:
                    masked_env.append(e)

            ip_addr = net.get("IPAddress")
            if not ip_addr and net.get("Networks"):
                for n_name, n_val in net.get("Networks").items():
                    if n_val.get("IPAddress"):
                        ip_addr = n_val.get("IPAddress")
                        break

            mounts = attrs.get("Mounts", []) or []
            mounts_list = [
                {
                    "type": m.get("Type"),
                    "source": m.get("Source"),
                    "destination": m.get("Destination"),
                    "mode": m.get("Mode"),
                }
                for m in mounts
            ]

            return ContainerDetail(
                id=c.id,
                short_id=c.short_id,
                name=c.name.lstrip("/"),
                image=cfg.get("Image", ""),
                status=c.status,
                state=attrs.get("State", {}).get("Status", c.status),
                created_at=attrs.get("Created", ""),
                restart_count=attrs.get("RestartCount", 0),
                command=" ".join(cfg.get("Cmd", [])) if cfg.get("Cmd") else None,
                ip_address=ip_addr,
                ports=net.get("Ports", {}) or {},
                env_vars=masked_env,
                mounts=mounts_list,
            )
        except NotFound:
            raise HTTPException(status_code=404, detail="Container not found.")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to inspect container: {str(e)}")

    @classmethod
    def get_container_stats(cls, container_id: str) -> ContainerStats:
        client = cls.get_client()
        if not client:
            raise HTTPException(status_code=503, detail="Docker daemon is offline.")

        try:
            c = client.containers.get(container_id)
            stats = c.stats(stream=False)

            # Calculate CPU percentage
            cpu_percent = 0.0
            cpu_stats = stats.get("cpu_stats", {})
            precpu_stats = stats.get("precpu_stats", {})
            cpu_delta = cpu_stats.get("cpu_usage", {}).get("total_usage", 0) - precpu_stats.get("cpu_usage", {}).get("total_usage", 0)
            system_delta = cpu_stats.get("system_cpu_usage", 0) - precpu_stats.get("system_cpu_usage", 0)
            online_cpus = cpu_stats.get("online_cpus", 1)

            if system_delta > 0 and cpu_delta > 0:
                cpu_percent = round((cpu_delta / system_delta) * online_cpus * 100.0, 2)

            # Calculate Memory percentage & usage
            mem_stats = stats.get("memory_stats", {})
            mem_usage = mem_stats.get("usage", 0)
            mem_limit = mem_stats.get("limit", 1)
            mem_usage_mb = round(mem_usage / (1024 * 1024), 2)
            mem_limit_mb = round(mem_limit / (1024 * 1024), 2)
            mem_percent = round((mem_usage / mem_limit) * 100.0, 2) if mem_limit > 0 else 0.0

            pids = stats.get("pids_stats", {}).get("current", 0)

            return ContainerStats(
                container_id=c.id,
                cpu_percent=cpu_percent,
                memory_usage_mb=mem_usage_mb,
                memory_limit_mb=mem_limit_mb,
                memory_percent=mem_percent,
                pids=pids,
            )
        except NotFound:
            raise HTTPException(status_code=404, detail="Container not found.")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get container stats: {str(e)}")

    @classmethod
    def get_container_logs(cls, container_id: str, tail: int = 100) -> ContainerLogs:
        client = cls.get_client()
        if not client:
            raise HTTPException(status_code=503, detail="Docker daemon is offline.")

        try:
            c = client.containers.get(container_id)
            logs_bytes = c.logs(tail=tail, timestamps=True)
            logs_text = logs_bytes.decode("utf-8", errors="replace")
            return ContainerLogs(container_id=c.id, tail=tail, logs=logs_text)
        except NotFound:
            raise HTTPException(status_code=404, detail="Container not found.")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch logs: {str(e)}")

    @classmethod
    def execute_action(cls, container_id: str, action: str) -> Dict[str, Any]:
        client = cls.get_client()
        if not client:
            raise HTTPException(status_code=503, detail="Docker daemon is offline.")

        try:
            c = client.containers.get(container_id)
            if action == "restart":
                c.restart(timeout=10)
            elif action == "start":
                c.start()
            elif action == "stop":
                c.stop(timeout=10)
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported action: {action}")

            c.reload()
            return {
                "container_id": c.id,
                "name": c.name,
                "action": action,
                "new_status": c.status,
            }
        except NotFound:
            raise HTTPException(status_code=404, detail="Container not found.")
        except APIError as e:
            raise HTTPException(status_code=400, detail=f"Docker API error: {str(e)}")

    @classmethod
    def list_images(cls) -> List[DockerImageItem]:
        client = cls.get_client()
        if not client:
            return []

        try:
            images = client.images.list()
            results = []
            for img in images:
                tags = img.tags if img.tags else ["<none>:<none>"]
                for t in tags:
                    if ":" in t:
                        repo, tag = t.split(":", 1)
                    else:
                        repo, tag = t, "latest"

                    size_mb = round(img.attrs.get("Size", 0) / (1024 * 1024), 2)
                    created = img.attrs.get("Created", "")

                    results.append(
                        DockerImageItem(
                            id=img.id,
                            short_id=img.short_id,
                            repository=repo,
                            tag=tag,
                            size_mb=size_mb,
                            created_at=created,
                        )
                    )
            return results
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to list images: {str(e)}")
