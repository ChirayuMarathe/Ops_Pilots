import hashlib
import hmac
import json


def generate_signature(payload_bytes: bytes, secret: str) -> str:
    sig = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
    return f"sha256={sig}"


def test_webhook_valid_signature_and_event(client):
    secret = "opspilot-webhook-secret-shared"
    payload = {
        "action": "completed",
        "workflow_run": {
            "id": 99887766,
            "workflow_id": 12345,
            "status": "completed",
            "conclusion": "success",
            "name": "CI/CD Production Deployment"
        },
        "repository": {
            "name": "payment-api"
        }
    }
    body = json.dumps(payload).encode("utf-8")
    sig = generate_signature(body, secret)

    headers = {
        "X-GitHub-Event": "workflow_run",
        "X-Hub-Signature-256": sig,
        "Content-Type": "application/json",
    }
    response = client.post("/api/v1/github/webhooks", content=body, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "processed"
    assert response.json()["event"] == "workflow_run"


def test_webhook_invalid_signature_rejected(client):
    body = json.dumps({"action": "ping"}).encode("utf-8")
    headers = {
        "X-GitHub-Event": "ping",
        "X-Hub-Signature-256": "sha256=invalid-tampered-signature-0000000000000",
        "Content-Type": "application/json",
    }
    response = client.post("/api/v1/github/webhooks", content=body, headers=headers)
    assert response.status_code == 401
    assert "Invalid webhook signature" in response.json()["detail"]
