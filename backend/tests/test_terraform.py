from unittest.mock import patch
from app.schemas.terraform import TerraformActionResponse, TerraformPlanResponse, TerraformStateResource


def get_auth_token(client, username="tf_user", email="tf@example.com"):
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "username": username, "password": "Password123!"},
    )
    resp = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": username, "password": "Password123!"},
    )
    return resp.json()["access_token"]


def test_terraform_crud_workspace(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Create workspace
    create_payload = {
        "name": "Dev Infrastructure",
        "slug": "dev-infra",
        "description": "Local test infrastructure",
        "main_tf": 'resource "local_file" "test" {\n  content = "hello world"\n  filename = "${path.module}/hello.txt"\n}\n',
        "requires_approval": True,
    }
    create_resp = client.post("/api/v1/terraform/workspaces", json=create_payload, headers=headers)
    assert create_resp.status_code == 201
    ws = create_resp.json()
    assert ws["name"] == "Dev Infrastructure"
    assert ws["slug"] == "dev-infra"
    assert ws["status"] == "uninitialized"
    assert ws["is_approved"] is False
    ws_id = ws["id"]

    # List workspaces
    list_resp = client.get("/api/v1/terraform/workspaces", headers=headers)
    assert list_resp.status_code == 200
    workspaces = list_resp.json()
    assert any(w["id"] == ws_id for w in workspaces)

    # Get workspace
    get_resp = client.get(f"/api/v1/terraform/workspaces/{ws_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == ws_id


def test_terraform_approval_gate_blocks_unapproved_apply(client):
    token = get_auth_token(client, username="gate_user", email="gate@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_payload = {
        "name": "Production App",
        "slug": "prod-app",
        "description": "Production cluster",
        "main_tf": 'resource "null_resource" "dummy" {}\n',
        "requires_approval": True,
    }
    ws = client.post("/api/v1/terraform/workspaces", json=create_payload, headers=headers).json()
    ws_id = ws["id"]

    # Attempt to apply immediately without approval -> must return 403 Forbidden
    apply_resp = client.post(f"/api/v1/terraform/workspaces/{ws_id}/apply", headers=headers)
    assert apply_resp.status_code == 403
    assert "approval" in apply_resp.json()["detail"].lower()


@patch("app.services.terraform_service.TerraformService._run_tf_command")
def test_terraform_lifecycle_plan_approve_apply(mock_run, client):
    token = get_auth_token(client, username="ops_lead", email="lead@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    create_payload = {
        "name": "Staging VPC",
        "slug": "staging-vpc",
        "description": "VPC network for staging",
        "main_tf": 'resource "aws_vpc" "main" { cidr_block = "10.0.0.0/16" }',
        "requires_approval": True,
    }
    ws = client.post("/api/v1/terraform/workspaces", json=create_payload, headers=headers).json()
    ws_id = ws["id"]

    # 1. Init
    mock_run.return_value = (0, "Terraform has been successfully initialized!", 1)
    init_resp = client.post(f"/api/v1/terraform/workspaces/{ws_id}/init", headers=headers)
    assert init_resp.status_code == 200
    assert init_resp.json()["status"] == "success"

    # 2. Plan
    mock_run.return_value = (0, "Terraform will perform the following actions:\nPlan: 2 to add, 1 to change, 0 to destroy.", 2)
    plan_resp = client.post(f"/api/v1/terraform/workspaces/{ws_id}/plan", headers=headers)
    assert plan_resp.status_code == 200
    plan_data = plan_resp.json()
    assert plan_data["resources_to_add"] == 2
    assert plan_data["resources_to_change"] == 1
    assert plan_data["resources_to_destroy"] == 0

    # 3. Approve
    approve_resp = client.post(f"/api/v1/terraform/workspaces/{ws_id}/approve", headers=headers)
    assert approve_resp.status_code == 200
    assert approve_resp.json()["is_approved"] is True
    assert approve_resp.json()["approved_by"] == "ops_lead"

    # 4. Apply
    mock_run.return_value = (0, "Apply complete! Resources: 2 added, 1 changed, 0 destroyed.", 3)
    apply_resp = client.post(f"/api/v1/terraform/workspaces/{ws_id}/apply", headers=headers)
    assert apply_resp.status_code == 200
    assert apply_resp.json()["status"] == "success"

    # 5. Check Runs history
    runs_resp = client.get(f"/api/v1/terraform/workspaces/{ws_id}/runs", headers=headers)
    assert runs_resp.status_code == 200
    runs = runs_resp.json()
    assert len(runs) >= 3
    actions = [r["action"] for r in runs]
    assert "apply" in actions
    assert "plan" in actions
    assert "init" in actions
