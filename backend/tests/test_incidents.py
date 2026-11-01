def get_auth_token(client, username="incident_user", email="incident@example.com"):
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "username": username, "password": "Password123!"},
    )
    resp = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": username, "password": "Password123!"},
    )
    return resp.json()["access_token"]


def test_incident_lifecycle_and_evidence(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create incident
    create_payload = {
        "title": "Payment Gateway Latency Degradation",
        "service_name": "payment-api",
        "severity": "critical",
        "description": "5xx errors spiking following upstream gateway deployment.",
    }
    resp = client.post("/api/v1/incidents", json=create_payload, headers=headers)
    assert resp.status_code == 201
    inc = resp.json()
    assert inc["title"] == "Payment Gateway Latency Degradation"
    assert inc["status"] == "open"
    assert inc["severity"] == "critical"
    # Evidence must be auto-correlated
    assert inc["evidence_metrics"] is not None
    assert inc["evidence_logs"] is not None
    inc_id = inc["id"]

    # 2. List incidents
    list_resp = client.get("/api/v1/incidents", headers=headers)
    assert list_resp.status_code == 200
    assert any(i["id"] == inc_id for i in list_resp.json())

    # 3. Transition to investigating
    patch_resp = client.patch(
        f"/api/v1/incidents/{inc_id}",
        json={"status": "investigating", "root_cause": "Database connection pool exhausted"},
        headers=headers,
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "investigating"
    assert patch_resp.json()["root_cause"] == "Database connection pool exhausted"

    # 4. Resolve incident
    resolve_resp = client.patch(
        f"/api/v1/incidents/{inc_id}",
        json={"status": "resolved", "resolution_notes": "Increased pool size to 50 connections."},
        headers=headers,
    )
    assert resolve_resp.status_code == 200
    assert resolve_resp.json()["status"] == "resolved"
    assert resolve_resp.json()["resolved_at"] is not None

    # 5. Incident Summary
    summary_resp = client.get("/api/v1/incidents/summary", headers=headers)
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert "total_active" in summary
    assert "mean_time_to_resolve_minutes" in summary


def test_alert_rule_evaluation_and_auto_incident(client):
    token = get_auth_token(client, username="alert_user", email="alert@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # List default alert rules
    alerts_resp = client.get("/api/v1/incidents/alerts/list", headers=headers)
    assert alerts_resp.status_code == 200
    alerts = alerts_resp.json()
    assert len(alerts) >= 1
    target_alert = alerts[0]

    # Evaluate alert
    eval_resp = client.post(f"/api/v1/incidents/alerts/{target_alert['id']}/evaluate", headers=headers)
    assert eval_resp.status_code == 200
    eval_data = eval_resp.json()
    assert "is_breached" in eval_data
    assert "metric_value" in eval_data
