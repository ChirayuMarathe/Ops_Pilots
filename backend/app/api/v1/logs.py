from typing import List, Optional
from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user
from app.models import User
from app.schemas.observability import LokiQueryResponse, LokiStatusResponse
from app.services.loki_service import LokiService

router = APIRouter()


@router.get("/status", response_model=LokiStatusResponse)
async def get_loki_status(current_user: User = Depends(get_current_user)):
    return await LokiService.get_status()


@router.get("/query", response_model=LokiQueryResponse)
async def query_loki_logs(
    query: str = Query('{app=~".+"}', description="LogQL query"),
    limit: int = Query(100, ge=10, le=1000),
    severity: Optional[str] = Query(None, description="Severity filter: INFO, WARNING, ERROR, DEBUG"),
    service: Optional[str] = Query(None, description="Service name filter"),
    current_user: User = Depends(get_current_user),
):
    return await LokiService.query_logs(
        logql_query=query,
        limit=limit,
        severity=severity,
        service=service,
    )


@router.get("/services", response_model=List[str])
async def list_log_services(current_user: User = Depends(get_current_user)):
    return await LokiService.list_services()
