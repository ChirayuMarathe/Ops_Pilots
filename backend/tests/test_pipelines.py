def get_auth_token(client, username="pipe_user", email="pipe@example.com"):
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


def test_pipeline_crud_and_trigger(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a project first
    proj_resp = client.post("/api/v1/projects", json={
        "name": "Auth Service",
        "slug": "auth-service",
        "repository_url": "https://github.com/opspilot/auth-service",
        "default_branch": "main"
    }, headers=headers)
    assert proj_resp.status_code == 201
    project_id = proj_resp.json()["id"]

    # 2. Create pipeline
    pipe_payload = {
        "project_id": project_id,
        "name": "Deploy to Staging",
        "workflow_file": ".github/workflows/deploy.yml",
        "trigger_type": "manual",
        "is_active": True
    }
    pipe_resp = client.post("/api/v1/pipelines", json=pipe_payload, headers=headers)
    assert pipe_resp.status_code == 201
    pipe_data = pipe_resp.json()
    assert pipe_data["name"] == "Deploy to Staging"
    pipeline_id = pipe_data["id"]

    # 3. List pipelines
    list_resp = client.get(f"/api/v1/pipelines?project_id={project_id}", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1

    # 4. Trigger pipeline
    trigger_resp = client.post(
        f"/api/v1/pipelines/{pipeline_id}/trigger",
        json={"branch": "main"},
        headers=headers
    )
    assert trigger_resp.status_code == 200
    run_data = trigger_resp.json()
    assert run_data["run_number"] == 1
    assert run_data["status"] == "in_progress"
    assert len(run_data["stages_data"]) == 5  # Test, Build, Scan, Deploy, Verify

    # 5. List runs
    runs_resp = client.get(f"/api/v1/pipelines/{pipeline_id}/runs", headers=headers)
    assert runs_resp.status_code == 200
    assert len(runs_resp.json()) == 1
    assert runs_resp.json()[0]["id"] == run_data["id"]

