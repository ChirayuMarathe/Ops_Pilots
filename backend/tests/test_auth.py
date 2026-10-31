def test_register_user_success(client):
    payload = {
        "email": "devops@example.com",
        "username": "devops_lead",
        "password": "SuperSecretPassword123!",
        "full_name": "DevOps Lead"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["email"] == "devops@example.com"
    assert data["username"] == "devops_lead"
    assert "id" in data
    assert "hashed_password" not in data


def test_register_duplicate_email(client):
    payload = {
        "email": "dup@example.com",
        "username": "user1",
        "password": "Password123!"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text

    dup_payload = {
        "email": "dup@example.com",
        "username": "user2",
        "password": "Password123!"
    }
    response = client.post("/api/v1/auth/register", json=dup_payload)
    assert response.status_code == 400
    assert "email address already exists" in response.json()["detail"]


def test_login_and_get_me(client):
    # Register user
    reg_payload = {
        "email": "auth_test@example.com",
        "username": "auth_tester",
        "password": "ValidPassword999!"
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201, reg_resp.text

    # Login
    login_payload = {
        "username_or_email": "auth_tester",
        "password": "ValidPassword999!"
    }
    login_resp = client.post("/api/v1/auth/login", json=login_payload)
    assert login_resp.status_code == 200, login_resp.text
    token = login_resp.json()["access_token"]
    assert token

    # Access protected /me endpoint
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["username"] == "auth_tester"


def test_login_invalid_password(client):
    reg_payload = {
        "email": "wrongpass@example.com",
        "username": "wrongpass_user",
        "password": "CorrectPassword123!"
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201, reg_resp.text

    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "wrongpass_user", "password": "WrongPassword!"}
    )
    assert login_resp.status_code == 401
