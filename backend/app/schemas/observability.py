from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class MetricSeriesPoint(BaseModel):
    timestamp: float
    value: float


class MetricSeries(BaseModel):
    labels: Dict[str, str] = {}
    values: List[MetricSeriesPoint] = []


class PrometheusQueryResult(BaseModel):
    query: str
    result_type: str
    series: List[MetricSeries] = []


class PrometheusQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="PromQL query string")
    time: Optional[float] = None


class PrometheusQueryRangeRequest(BaseModel):
    query: str = Field(..., min_length=1, description="PromQL query string")
    start: float
    end: float
    step: str = "15s"


class ObservabilityOverviewResponse(BaseModel):
    is_prometheus_online: bool
    is_loki_online: bool
    prometheus_url: str
    loki_url: str
    grafana_url: str
    cpu_usage_percent: float
    memory_usage_percent: float
    request_rate_rps: float
    error_rate_percent: float
    p95_latency_ms: float
    container_restarts: int


class LokiLogItem(BaseModel):
    id: str
    timestamp: str
    severity: str  # INFO, WARNING, ERROR, DEBUG
    service: str
    message: str
    labels: Dict[str, str] = {}


class LokiQueryResponse(BaseModel):
    is_connected: bool
    total_lines: int
    query: str
    logs: List[LokiLogItem] = []


class LokiStatusResponse(BaseModel):
    is_connected: bool
    status: str
    url: str
    error: Optional[str] = None


class GrafanaConfigResponse(BaseModel):
    is_connected: bool
    url: str
    dashboards: List[Dict[str, str]] = []
