def test_get_profile_requires_auth(client):
    resp = client.get("/profile")
    assert resp.status_code == 401


def test_get_profile_without_one_returns_404(client, register_and_login):
    _, headers = register_and_login()
    resp = client.get("/profile", headers=headers)
    assert resp.status_code == 404


def test_put_profile_creates_profile(client, register_and_login):
    _, headers = register_and_login()

    payload = {
        "full_name": "Jane Doe",
        "phone": "+91-9876543210",
        "current_location": "Mumbai",
        "desired_role": "Backend Software Engineer",
        "skills": ["Python", "FastAPI", "PostgreSQL"],
        "experience_level": "mid",
        "preferred_locations": ["Bangalore", "Remote"],
        "remote_preference": "remote",
        "employment_type": "full_time",
    }
    resp = client.put("/profile", headers=headers, json=payload)
    assert resp.status_code == 200, resp.text
    body = resp.json()

    assert body["full_name"] == "Jane Doe"
    assert body["phone"] == "+91-9876543210"
    assert body["current_location"] == "Mumbai"
    assert body["desired_role"] == "Backend Software Engineer"
    assert body["skills"] == ["Python", "FastAPI", "PostgreSQL"]
    assert body["experience_level"] == "mid"
    assert body["preferred_locations"] == ["Bangalore", "Remote"]
    assert body["remote_preference"] == "remote"
    assert body["employment_type"] == "full_time"
    assert "id" in body and "user_id" in body

    # And it's now retrievable via GET
    resp = client.get("/profile", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["desired_role"] == "Backend Software Engineer"


def test_put_profile_partial_update_only_touches_given_fields(client, register_and_login):
    _, headers = register_and_login()

    client.put(
        "/profile",
        headers=headers,
        json={"desired_role": "Data Analyst", "skills": ["SQL", "Excel"]},
    )

    resp = client.put("/profile", headers=headers, json={"remote_preference": "hybrid"})
    assert resp.status_code == 200, resp.text
    body = resp.json()

    # Untouched fields survive the partial update
    assert body["desired_role"] == "Data Analyst"
    assert body["skills"] == ["SQL", "Excel"]
    # New field applied
    assert body["remote_preference"] == "hybrid"


def test_put_profile_rejects_blank_desired_role(client, register_and_login):
    _, headers = register_and_login()
    resp = client.put("/profile", headers=headers, json={"desired_role": "   "})
    assert resp.status_code == 400


def test_put_profile_rejects_blank_full_name(client, register_and_login):
    _, headers = register_and_login()
    resp = client.put("/profile", headers=headers, json={"full_name": "   "})
    assert resp.status_code == 400


def test_delete_profile(client, register_and_login):
    _, headers = register_and_login()
    client.put("/profile", headers=headers, json={"desired_role": "Data Analyst"})

    resp = client.delete("/profile", headers=headers)
    assert resp.status_code == 204

    resp = client.get("/profile", headers=headers)
    assert resp.status_code == 404


def test_profile_is_scoped_to_owner(client, register_and_login):
    AT = chr(64)
    _, headers1 = register_and_login(email="profileowner" + AT + "example.com")
    _, headers2 = register_and_login(email="profileother" + AT + "example.com")

    client.put("/profile", headers=headers1, json={"desired_role": "Backend Engineer"})

    # user2 has no profile of their own
    resp = client.get("/profile", headers=headers2)
    assert resp.status_code == 404