AT = chr(64)


def email(local, domain="example.com"):
    return local + AT + domain


def test_register_creates_user(client):
    resp = client.post("/auth/register", json={"email": email("newuser"), "password": "password123"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == email("newuser")
    assert "id" in body
    assert "hashed_password" not in body  # never leak the hash


def test_register_duplicate_email_rejected(client):
    client.post("/auth/register", json={"email": email("dup"), "password": "password123"})
    resp = client.post("/auth/register", json={"email": email("dup"), "password": "password456"})
    assert resp.status_code == 400


def test_register_password_too_short_rejected(client):
    resp = client.post("/auth/register", json={"email": email("shortpw"), "password": "short"})
    assert resp.status_code == 400


def test_register_invalid_email_rejected(client):
    resp = client.post("/auth/register", json={"email": "not-an-email", "password": "password123"})
    assert resp.status_code == 400


def test_login_success_returns_token(client):
    client.post("/auth/register", json={"email": email("loginuser"), "password": "password123"})
    resp = client.post("/auth/login", json={"email": email("loginuser"), "password": "password123"})
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_login_wrong_password_rejected(client):
    client.post("/auth/register", json={"email": email("wrongpw"), "password": "password123"})
    resp = client.post("/auth/login", json={"email": email("wrongpw"), "password": "wrongpass"})
    assert resp.status_code == 401


def test_login_nonexistent_user_rejected(client):
    resp = client.post("/auth/login", json={"email": email("nosuchuser"), "password": "password123"})
    assert resp.status_code == 401
