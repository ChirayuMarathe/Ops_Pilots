from unittest.mock import AsyncMock, patch
from app.schemas.observability import PrometheusQueryResult, MetricSeries, MetricSeriesPoint


def get_auth_token(client, username="obs_user", email="obs@example.com"):
    client.post("/api/v1/auth/register", json={
        "email": email,
        "username": username,
        "password": "Password123!"
    })
    resp = client.post("/api/v1/auth/login", json={
        "username_or_email": username,
        "password": "Password123!"
    })
    return resp.json()["access_token"]


def test_monitoring_status_endpoint(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/v1/monitoring/status", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "prometheus" in data
    assert "loki" in data
    assert "grafana" in data


def test_monitoring_overview_endpoint(client):
    token = get_auth_token(client, username="obs_user2", email="obs2@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/v1/monitoring/overview", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "cpu_usage_percent" in data
    assert "memory_usage_percent" in data
    assert "request_rate_rps" in data
    assert "error_rate_percent" in data
    assert "p95_latency_ms" in data


def test_promql_query_endpoint_mocked(client):
    token = get_auth_token(client, username="obs_user3", email="obs3@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    mock_result = PrometheusQueryResult(
        query="rate(http_requests_total[5m])",
        result_type="vector",
        series=[
            MetricSeries(
                labels={"service": "payment-api"},
                values=[MetricSeriesPoint(timestamp=1700000000.0, value=25.4)]
            )
        ]
    )

    with patch("app.services.prometheus_service.PrometheusService.query_instant", new_callable=AsyncMock) as mock_q:
        mock_q.return_value = mock_result
        resp = client.post(
            "/api/v1/monitoring/query",
            json={"query": "rate(http_requests_total[5m])"},
            headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["query"] == "rate(http_requests_total[5m])"
        assert len(data["series"]) == 1
        assert data["series"][0]["values"][0]["value"] == 25.4


def test_loki_logs_query_endpoint(client):
    token = get_auth_token(client, username="obs_user4", email="obs4@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/logs/query?limit=50&severity=ERROR", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "is_connected" in data
    assert "logs" in data

