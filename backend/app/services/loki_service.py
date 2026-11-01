from datetime import datetime, timezone
import json
import re
from typing import Any, Dict, List, Optional
import httpx

from app.core.config import settings
from app.schemas.observability import LokiLogItem, LokiQueryResponse, LokiStatusResponse


class LokiService:
    @classmethod
    def get_url(cls) -> str:
        return settings.LOKI_URL.rstrip("/")

    @classmethod
    async def check_health(cls) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{cls.get_url()}/ready")
                return res.status_code == 200
        except Exception:
            return False

    @classmethod
    async def get_status(cls) -> LokiStatusResponse:
        is_ready = await cls.check_health()
        return LokiStatusResponse(
            is_connected=is_ready,
            status="online" if is_ready else "offline",
            url=cls.get_url(),
            error=None if is_ready else "Loki log aggregation daemon is offline or unreachable.",
        )

    @classmethod
    async def query_logs(
        cls,
        logql_query: str = '{app=~".+"}',
        limit: int = 100,
        severity: Optional[str] = None,
        service: Optional[str] = None,
    ) -> LokiQueryResponse:
        is_ready = await cls.check_health()
        if not is_ready:
            return LokiQueryResponse(
                is_connected=False,
                total_lines=0,
                query=logql_query,
                logs=[],
            )

        # Build LogQL query
        effective_query = logql_query
        if service and service != "all":
            if "{" in effective_query:
                effective_query = effective_query.replace("{", f'{{service="{service}",', 1)
            else:
                effective_query = f'{{service="{service}"}}'

        if severity and severity != "ALL":
            effective_query = f'{effective_query} |= "{severity}"'

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(
                    f"{cls.get_url()}/loki/api/v1/query_range",
                    params={"query": effective_query, "limit": limit},
                )
                if res.status_code != 200:
                    return LokiQueryResponse(
                        is_connected=True,
                        total_lines=0,
                        query=effective_query,
                        logs=[],
                    )

                data = res.json().get("data", {})
                streams = data.get("result", [])

                log_items = []
                for s in streams:
                    stream_labels = s.get("stream", {})
                    svc_name = stream_labels.get("service") or stream_labels.get("app") or "application"
                    for val_pair in s.get("values", []):
                        ts_nano, line = val_pair[0], val_pair[1]
                        ts_sec = int(ts_nano) / 1e9
                        ts_iso = datetime.fromtimestamp(ts_sec, tz=timezone.utc).isoformat()

                        # Detect severity level
                        detected_sev = "INFO"
                        line_upper = line.upper()
                        if "ERROR" in line_upper or "FATAL" in line_upper or "EXCEPTION" in line_upper:
                            detected_sev = "ERROR"
                        elif "WARN" in line_upper:
                            detected_sev = "WARNING"
                        elif "DEBUG" in line_upper:
                            detected_sev = "DEBUG"

                        log_items.append(
                            LokiLogItem(
                                id=str(ts_nano),
                                timestamp=ts_iso,
                                severity=detected_sev,
                                service=svc_name,
                                message=line,
                                labels=stream_labels,
                            )
                        )

                # Sort by timestamp descending
                log_items.sort(key=lambda x: x.timestamp, reverse=True)

                return LokiQueryResponse(
                    is_connected=True,
                    total_lines=len(log_items),
                    query=effective_query,
                    logs=log_items,
                )
        except Exception:
            return LokiQueryResponse(
                is_connected=False,
                total_lines=0,
                query=effective_query,
                logs=[],
            )

    @classmethod
    async def list_services(cls) -> List[str]:
        if not await cls.check_health():
            return ["auth-service", "payment-api", "inventory-svc", "opspilot-core"]

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(f"{cls.get_url()}/loki/api/v1/label/service/values")
                if res.status_code == 200:
                    return res.json().get("data", [])
                return []
        except Exception:
            return []

