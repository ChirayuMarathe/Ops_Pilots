from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from kubernetes import client, config
from kubernetes.client.rest import ApiException
from kubernetes.config.config_exception import ConfigException
from fastapi import HTTPException, status

from app.schemas.kubernetes import (
    ClusterInfoResponse,
    DeploymentItem,
    K8sEventItem,
    NamespaceItem,
    NodeItem,
    PodItem,
    PodLogsResponse,
    ServiceItem,
)


class KubernetesService:
    _initialized = False
    _context_name = None

    @classmethod
    def _init_client(cls) -> bool:
        try:
            config.load_kube_config()
            cls._initialized = True
            try:
                contexts, active = config.list_kube_config_contexts()
                cls._context_name = active.get("name") if active else "default"
            except Exception:
                cls._context_name = "default"
            return True
        except ConfigException:
            try:
                config.load_incluster_config()
                cls._initialized = True
                cls._context_name = "in-cluster"
                return True
            except ConfigException:
                cls._initialized = False
                return False
        except Exception:
            cls._initialized = False
            return False

    @classmethod
    def get_cluster_info(cls) -> ClusterInfoResponse:
        if not cls._init_client():
            return ClusterInfoResponse(
                is_connected=False,
                status="offline",
                error="No valid Kubernetes configuration (kubeconfig) detected on this host."
            )

        try:
            v1 = client.CoreV1Api()
            version_api = client.VersionApi()

            server_version_info = version_api.get_code()
            server_version = f"v{server_version_info.major}.{server_version_info.minor}"

            nodes_list = v1.list_node(timeout_seconds=5).items
            nodes = []
            for n in nodes_list:
                status_str = "NotReady"
                for cond in n.status.conditions or []:
                    if cond.type == "Ready" and cond.status == "True":
                        status_str = "Ready"
                        break

                # Roles
                roles = []
                for label in n.metadata.labels or {}:
                    if "node-role.kubernetes.io/" in label:
                        roles.append(label.split("node-role.kubernetes.io/")[1])
                if not roles:
                    roles = ["worker"]

                nodes.append(
                    NodeItem(
                        name=n.metadata.name,
                        status=status_str,
                        roles=roles,
                        version=n.status.node_info.kubelet_version if n.status.node_info else "unknown",
                        os_image=n.status.node_info.os_image if n.status.node_info else "unknown",
                        cpu_capacity=str(n.status.capacity.get("cpu", "1")),
                        memory_capacity=str(n.status.capacity.get("memory", "1Gi")),
                    )
                )

            all_ready = all(n.status == "Ready" for n in nodes) if nodes else False
            cluster_status = "healthy" if all_ready else "degraded"

            return ClusterInfoResponse(
                is_connected=True,
                cluster_name=cls._context_name or "local-cluster",
                server_version=server_version,
                node_count=len(nodes),
                nodes=nodes,
                status=cluster_status,
            )
        except Exception as e:
            return ClusterInfoResponse(
                is_connected=False,
                status="offline",
                cluster_name=cls._context_name,
                error=f"Kubernetes API server unreachable: {str(e)}"
            )

    @classmethod
    def list_namespaces(cls) -> List[NamespaceItem]:
        if not cls._init_client():
            return []

        try:
            v1 = client.CoreV1Api()
            namespaces = v1.list_namespace(timeout_seconds=5).items
            return [
                NamespaceItem(
                    name=ns.metadata.name,
                    status=ns.status.phase if ns.status else "Active",
                    created_at=ns.metadata.creation_timestamp.isoformat() if ns.metadata.creation_timestamp else "",
                )
                for ns in namespaces
            ]
        except Exception:
            return []

    @classmethod
    def list_pods(cls, namespace: Optional[str] = None) -> List[PodItem]:
        if not cls._init_client():
            return []

        try:
            v1 = client.CoreV1Api()
            if namespace and namespace != "all":
                pods = v1.list_namespaced_pod(namespace=namespace, timeout_seconds=5).items
            else:
                pods = v1.list_pod_for_all_namespaces(timeout_seconds=5).items

            results = []
            for p in pods:
                containers = p.status.container_statuses or []
                ready_count = sum(1 for c in containers if c.ready)
                total_count = len(p.spec.containers) if p.spec and p.spec.containers else 1
                restarts = sum(c.restart_count for c in containers)

                images = [c.image for c in p.spec.containers] if p.spec and p.spec.containers else []

                results.append(
                    PodItem(
                        name=p.metadata.name,
                        namespace=p.metadata.namespace,
                        phase=p.status.phase or "Unknown",
                        status=p.status.phase or "Unknown",
                        ready_containers=f"{ready_count}/{total_count}",
                        restarts=restarts,
                        ip=p.status.pod_ip,
                        node=p.spec.node_name,
                        created_at=p.metadata.creation_timestamp.isoformat() if p.metadata.creation_timestamp else "",
                        images=images,
                    )
                )
            return results
        except Exception:
            return []

    @classmethod
    def get_pod_logs(
        cls, namespace: str, pod_name: str, container: Optional[str] = None, tail_lines: int = 100
    ) -> PodLogsResponse:
        if not cls._init_client():
            raise HTTPException(status_code=503, detail="Kubernetes cluster is not configured or offline.")

        try:
            v1 = client.CoreV1Api()
            logs = v1.read_namespaced_pod_log(
                name=pod_name,
                namespace=namespace,
                container=container,
                tail_lines=tail_lines,
                timestamps=True,
            )
            return PodLogsResponse(
                pod_name=pod_name,
                namespace=namespace,
                container=container,
                tail_lines=tail_lines,
                logs=logs or "No logs produced by this pod.",
            )
        except ApiException as e:
            raise HTTPException(status_code=e.status or 500, detail=f"Kubernetes API error: {e.reason}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read pod logs: {str(e)}")

    @classmethod
    def list_deployments(cls, namespace: Optional[str] = None) -> List[DeploymentItem]:
        if not cls._init_client():
            return []

        try:
            apps_v1 = client.AppsV1Api()
            if namespace and namespace != "all":
                deps = apps_v1.list_namespaced_deployment(namespace=namespace, timeout_seconds=5).items
            else:
                deps = apps_v1.list_deployment_for_all_namespaces(timeout_seconds=5).items

            results = []
            for d in deps:
                images = (
                    [c.image for c in d.spec.template.spec.containers]
                    if d.spec and d.spec.template and d.spec.template.spec and d.spec.template.spec.containers
                    else []
                )

                replicas = d.spec.replicas or 0
                ready = d.status.ready_replicas or 0 if d.status else 0
                updated = d.status.updated_replicas or 0 if d.status else 0
                available = d.status.available_replicas or 0 if d.status else 0

                results.append(
                    DeploymentItem(
                        name=d.metadata.name,
                        namespace=d.metadata.namespace,
                        replicas=replicas,
                        ready_replicas=ready,
                        up_to_date_replicas=updated,
                        available_replicas=available,
                        images=images,
                        created_at=d.metadata.creation_timestamp.isoformat() if d.metadata.creation_timestamp else "",
                    )
                )
            return results
        except Exception:
            return []

    @classmethod
    def scale_deployment(cls, namespace: str, name: str, replicas: int) -> Dict[str, Any]:
        if not cls._init_client():
            raise HTTPException(status_code=503, detail="Kubernetes cluster is not configured or offline.")

        try:
            apps_v1 = client.AppsV1Api()
            body = {"spec": {"replicas": replicas}}
            res = apps_v1.patch_namespaced_deployment_scale(name=name, namespace=namespace, body=body)
            return {
                "name": name,
                "namespace": namespace,
                "new_replicas": res.spec.replicas,
            }
        except ApiException as e:
            raise HTTPException(status_code=e.status or 500, detail=f"Kubernetes scale error: {e.reason}")

    @classmethod
    def restart_deployment(cls, namespace: str, name: str) -> Dict[str, Any]:
        if not cls._init_client():
            raise HTTPException(status_code=503, detail="Kubernetes cluster is not configured or offline.")

        try:
            apps_v1 = client.AppsV1Api()
            now_iso = datetime.now(timezone.utc).isoformat()
            body = {
                "spec": {
                    "template": {
                        "metadata": {
                            "annotations": {
                                "kubectl.kubernetes.io/restartedAt": now_iso
                            }
                        }
                    }
                }
            }
            apps_v1.patch_namespaced_deployment(name=name, namespace=namespace, body=body)
            return {
                "name": name,
                "namespace": namespace,
                "action": "rolling_restart",
                "restarted_at": now_iso,
            }
        except ApiException as e:
            raise HTTPException(status_code=e.status or 500, detail=f"Kubernetes restart error: {e.reason}")

    @classmethod
    def list_services(cls, namespace: Optional[str] = None) -> List[ServiceItem]:
        if not cls._init_client():
            return []

        try:
            v1 = client.CoreV1Api()
            if namespace and namespace != "all":
                services = v1.list_namespaced_service(namespace=namespace, timeout_seconds=5).items
            else:
                services = v1.list_service_for_all_namespaces(timeout_seconds=5).items

            results = []
            for s in services:
                ports_list = [f"{p.port}/{p.protocol}" for p in (s.spec.ports or [])]
                ext_ip = None
                if s.status and s.status.load_balancer and s.status.load_balancer.ingress:
                    ing = s.status.load_balancer.ingress[0]
                    ext_ip = ing.ip or ing.hostname

                results.append(
                    ServiceItem(
                        name=s.metadata.name,
                        namespace=s.metadata.namespace,
                        service_type=s.spec.type or "ClusterIP",
                        cluster_ip=s.spec.cluster_ip,
                        external_ip=ext_ip,
                        ports=ports_list,
                    )
                )
            return results
        except Exception:
            return []

    @classmethod
    def list_events(cls, namespace: Optional[str] = None) -> List[K8sEventItem]:
        if not cls._init_client():
            return []

        try:
            v1 = client.CoreV1Api()
            if namespace and namespace != "all":
                events = v1.list_namespaced_event(namespace=namespace, timeout_seconds=5).items
            else:
                events = v1.list_event_for_all_namespaces(timeout_seconds=5).items

            results = []
            for ev in events:
                obj = f"{ev.involved_object.kind}/{ev.involved_object.name}" if ev.involved_object else "Unknown"
                ts = (
                    ev.last_timestamp.isoformat()
                    if ev.last_timestamp
                    else (ev.event_time.isoformat() if ev.event_time else "")
                )
                results.append(
                    K8sEventItem(
                        event_type=ev.type or "Normal",
                        reason=ev.reason or "Event",
                        message=ev.message or "",
                        involved_object=obj,
                        timestamp=ts,
                    )
                )
            return results
        except Exception:
            return []

