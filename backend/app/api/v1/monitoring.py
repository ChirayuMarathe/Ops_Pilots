from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_current_user
from app.core.config import settings
from app.models import User
from app.schemas.observability import (
    GrafanaConfigResponse,
    ObservabilityOverviewResponse,
    PrometheusQueryRangeRequest,
    PrometheusQueryRequest,
    PrometheusQueryResult,
)
from app.services.loki_service import LokiService
from app.services.prometheus_service import PrometheusService

router = APIRouter()


@router.get("/status")
async def get_observability_status(current_user: User = Depends(get_current_user)):
    prom_healthy = await PrometheusService.check_health()
    loki_healthy = await LokiService.check_health()
    return {
        "prometheus": {
            "status": "online" if prom_healthy else "offline",
            "url": settings.PROMETHEUS_URL,
        },
        "loki": {
            "status": "online" if loki_healthy else "offline",
            "url": settings.LOKI_URL,
        },
        "grafana": {
            "status": "configured",
            "url": settings.GRAFANA_URL,
        },
    }


@router.get("/overview", response_model=ObservabilityOverviewResponse)
async def get_sre_golden_signals_overview(current_user: User = Depends(get_current_user)):
    prom_overview = await PrometheusService.get_overview()
    loki_healthy = await LokiService.check_health()

    return ObservabilityOverviewResponse(
        is_prometheus_online=prom_overview["is_prometheus_online"],
        is_loki_online=loki_healthy,
        prometheus_url=settings.PROMETHEUS_URL,
        loki_url=settings.LOKI_URL,
        grafana_url=settings.GRAFANA_URL,
        cpu_usage_percent=prom_overview["cpu_usage_percent"],
        memory_usage_percent=prom_overview["memory_usage_percent"],
        request_rate_rps=prom_overview["request_rate_rps"],
        error_rate_percent=prom_overview["error_rate_percent"],
        p95_latency_ms=prom_overview["p95_latency_ms"],
        container_restarts=prom_overview["container_restarts"],
    )


@router.post("/query", response_model=PrometheusQueryResult)
async def execute_promql_query(
    payload: PrometheusQueryRequest,
    current_user: User = Depends(get_current_user),
):
    return await PrometheusService.query_instant(query=payload.query, time=payload.time)


@router.post("/query_range", response_model=PrometheusQueryResult)
async def execute_promql_range_query(
    payload: PrometheusQueryRangeRequest,
    current_user: User = Depends(get_current_user),
):
    return await PrometheusService.query_range(
        query=payload.query,
        start=payload.start,
        end=payload.end,
        step=payload.step,
    )


@router.get("/grafana", response_model=GrafanaConfigResponse)
def get_grafana_configuration(current_user: User = Depends(get_current_user)):
    return GrafanaConfigResponse(
        is_connected=True,
        url=settings.GRAFANA_URL,
        dashboards=[
            {"id": "kubernetes-cluster", "name": "Kubernetes Cluster Telemetry", "uid": "k8s-cluster"},
            {"id": "node-exporter", "name": "Linux Node Exporter Metrics", "uid": "node-exporter"},
            {"id": "microservices", "name": "Microservices SRE Golden Signals", "uid": "microservices-sre"},
            {"id": "loki-logs", "name": "Centralized Workload Logs", "uid": "loki-logs"},
        ],
    )

