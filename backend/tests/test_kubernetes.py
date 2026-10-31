from unittest.mock import MagicMock, patch


def get_auth_token(client, username="k8s_user", email="k8s@example.com"):
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


def test_kubernetes_cluster_overview_safe_fallback(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/v1/kubernetes/cluster", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "is_connected" in data
    assert isinstance(data["is_connected"], bool)
    assert "status" in data


def test_kubernetes_pods_mocked(client):
    token = get_auth_token(client, username="k8s_user2", email="k8s2@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    mock_pod = MagicMock()
    mock_pod.metadata.name = "payment-api-7b89f899-xyz"
    mock_pod.metadata.namespace = "production"
    mock_pod.status.phase = "Running"
    mock_pod.status.pod_ip = "10.244.0.15"
    mock_pod.spec.node_name = "kind-control-plane"
    mock_pod.status.container_statuses = [MagicMock(ready=True, restart_count=1)]
    mock_pod.spec.containers = [MagicMock(image="ghcr.io/opspilot/payment-api:v1.2")]
    mock_pod.metadata.creation_timestamp = None

    mock_v1 = MagicMock()
    mock_v1.list_namespaced_pod.return_value.items = [mock_pod]

    with patch("app.services.kubernetes_service.KubernetesService._init_client", return_value=True), \
         patch("kubernetes.client.CoreV1Api", return_value=mock_v1):
        resp = client.get("/api/v1/kubernetes/pods?namespace=production", headers=headers)
        assert resp.status_code == 200
        pods = resp.json()
        assert len(pods) == 1
        assert pods[0]["name"] == "payment-api-7b89f899-xyz"
        assert pods[0]["phase"] == "Running"
        assert pods[0]["ready_containers"] == "1/1"
        assert pods[0]["restarts"] == 1


def test_kubernetes_deployment_scale_and_restart(client):
    token = get_auth_token(client, username="k8s_user3", email="k8s3@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    mock_scale_res = MagicMock()
    mock_scale_res.spec.replicas = 3

    mock_apps = MagicMock()
    mock_apps.patch_namespaced_deployment_scale.return_value = mock_scale_res

    with patch("app.services.kubernetes_service.KubernetesService._init_client", return_value=True), \
         patch("kubernetes.client.AppsV1Api", return_value=mock_apps):
        # 1. Test Scale
        scale_resp = client.post(
            "/api/v1/kubernetes/deployments/production/payment-api/scale",
            json={"replicas": 3},
            headers=headers
        )
        assert scale_resp.status_code == 200
        assert scale_resp.json()["new_replicas"] == 3

        # 2. Test Restart
        restart_resp = client.post(
            "/api/v1/kubernetes/deployments/production/payment-api/restart",
            headers=headers
        )
        assert restart_resp.status_code == 200
        assert restart_resp.json()["action"] == "rolling_restart"
