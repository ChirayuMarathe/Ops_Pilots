def get_auth_token(client, username="sec_user", email="sec@example.com"):
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "username": username, "password": "Password123!"},
    )
    resp = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": username, "password": "Password123!"},
    )
    return resp.json()["access_token"]


def test_secrets_vault_masking_and_reveal_audit(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create secret
    sec_payload = {
        "name": "Stripe Live Secret Key",
        "key": "STRIPE_SECRET_KEY",
        "value": "sk_live_51PTestKey1234567890",
        "environment": "production",
        "provider": "local",
        "description": "Production billing API key",
    }
    create_resp = client.post("/api/v1/security/secrets", json=sec_payload, headers=headers)
    assert create_resp.status_code == 201
    sec = create_resp.json()
    assert sec["key"] == "STRIPE_SECRET_KEY"
    # Never expose raw plaintext!
    assert sec["masked_value"] != "sk_live_51PTestKey1234567890"
    assert "7890" in sec["masked_value"]
    sec_id = sec["id"]

    # 2. List secrets -> must be masked
    list_resp = client.get("/api/v1/security/secrets", headers=headers)
    assert list_resp.status_code == 200
    listed_sec = next(s for s in list_resp.json() if s["id"] == sec_id)
    assert listed_sec["masked_value"].startswith("••••")

    # 3. Duplicate key rejection
    dup_resp = client.post("/api/v1/security/secrets", json=sec_payload, headers=headers)
    assert dup_resp.status_code == 400

    # 4. Reveal secret -> returns plaintext and generates AuditLog
    reveal_resp = client.post(f"/api/v1/security/secrets/{sec_id}/reveal", headers=headers)
    assert reveal_resp.status_code == 200
    assert reveal_resp.json()["plaintext_value"] == "sk_live_51PTestKey1234567890"

    # 5. Check Audit Logs contains SECRET_REVEALED
    audit_resp = client.get("/api/v1/security/audit-logs?action=SECRET_REVEALED", headers=headers)
    assert audit_resp.status_code == 200
    audits = audit_resp.json()
    assert any(a["action"] == "SECRET_REVEALED" for a in audits)


def test_trivy_vulnerability_scanner(client):
    token = get_auth_token(client, username="trivy_user", email="trivy@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    scan_payload = {"image_name": "python:3.11-alpine"}
    scan_resp = client.post("/api/v1/security/scans", json=scan_payload, headers=headers)
    assert scan_resp.status_code == 201
    scan = scan_resp.json()
    assert scan["image_name"] == "python:3.11-alpine"
    assert scan["status"] == "completed"
    assert len(scan["findings"]) > 0

    # List scans
    scans_list_resp = client.get("/api/v1/security/scans", headers=headers)
    assert scans_list_resp.status_code == 200
    assert len(scans_list_resp.json()) >= 1

