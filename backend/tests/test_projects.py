def get_auth_token(client, username="proj_user", email="proj@example.com"):
    reg_resp = client.post("/api/v1/auth/register", json={
        "email": email,
        "username": username,
        "password": "Password123!"
    })
    assert reg_resp.status_code == 201, reg_resp.text
    resp = client.post("/api/v1/auth/login", json={
        "username_or_email": username,
        "password": "Password123!"
    })
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def test_create_and_list_projects(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Initially empty list
    list_resp = client.get("/api/v1/projects", headers=headers)
    assert list_resp.status_code == 200
    assert list_resp.json() == []

    # Create project
    create_payload = {
        "name": "E-Commerce Gateway",
        "slug": "ecommerce-gateway",
        "description": "Production payment microservice",
        "repository_url": "https://github.com/opspilot/ecommerce-gateway",
        "default_branch": "main"
    }
    create_resp = client.post("/api/v1/projects", json=create_payload, headers=headers)
    assert create_resp.status_code == 201
    proj_data = create_resp.json()
    assert proj_data["name"] == "E-Commerce Gateway"
    assert proj_data["slug"] == "ecommerce-gateway"

    # Verify summary reflects the project
    summary_resp = client.get("/api/v1/dashboard/summary", headers=headers)
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert summary["total_projects"] == 1
    assert summary["active_deployments"] == 0
