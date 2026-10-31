from unittest.mock import MagicMock, patch
from app.schemas.docker import DockerStatusResponse


def get_auth_token(client, username="docker_user", email="docker@example.com"):
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


def test_docker_status_endpoint(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/v1/docker/status", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "is_available" in data
    # Should cleanly report either true or false without failing or throwing unhandled 500 error
    assert isinstance(data["is_available"], bool)


def test_docker_containers_mocked(client):
    token = get_auth_token(client, username="docker_user2", email="docker2@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Mock docker client
    mock_container = MagicMock()
    mock_container.id = "c1234567890abcdef"
    mock_container.short_id = "c1234567"
    mock_container.name = "opspilot-db"
    mock_container.image.tags = ["postgres:16-alpine"]
    mock_container.status = "running"
    mock_container.attrs = {
        "Config": {"Image": "postgres:16-alpine"},
        "State": {"Status": "running"},
        "Created": "2026-10-31T12:00:00Z",
        "RestartCount": 0,
        "NetworkSettings": {"Ports": {"5432/tcp": [{"HostPort": "5432"}]}}
    }

    mock_client = MagicMock()
    mock_client.containers.list.return_value = [mock_container]

    with patch("app.services.docker_service.DockerService.get_client", return_value=mock_client):
        response = client.get("/api/v1/docker/containers", headers=headers)
        assert response.status_code == 200
        containers = response.json()
        assert len(containers) == 1
        assert containers[0]["name"] == "opspilot-db"
        assert containers[0]["image_tag"] == "postgres:16-alpine"
        assert containers[0]["status"] == "running"


def test_docker_container_action_audit(client):
    token = get_auth_token(client, username="docker_user3", email="docker3@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    mock_container = MagicMock()
    mock_container.id = "c99999"
    mock_container.name = "opspilot-backend"
    mock_container.status = "running"

    mock_client = MagicMock()
    mock_client.containers.get.return_value = mock_container

    with patch("app.services.docker_service.DockerService.get_client", return_value=mock_client):
        response = client.post(
            "/api/v1/docker/containers/c99999/action",
            json={"action": "restart"},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["action"] == "restart"
        assert data["name"] == "opspilot-backend"
