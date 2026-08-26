AT = chr(64)


def email(local, domain="example.com"):
    return local + AT + domain


def _create_job(client, headers, **overrides):
    payload = {"company": "Acme Corp", "role": "Backend Engineer"}
    payload.update(overrides)
    return client.post("/jobs", json=payload, headers=headers)


# ---------- auth requirement ----------

def test_list_jobs_requires_auth(client):
    resp = client.get("/jobs")
    assert resp.status_code == 401


def test_create_job_requires_auth(client):
    resp = client.post("/jobs", json={"company": "Acme"})
    assert resp.status_code == 401


def test_invalid_token_rejected(client):
    resp = client.get("/jobs", headers={"Authorization": "Bearer not-a-real-token"})
    assert resp.status_code == 401


# ---------- create ----------

def test_create_job_success(client, register_and_login):
    _, headers = register_and_login()
    resp = _create_job(client, headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["company"] == "Acme Corp"
    assert body["status"] == "applied"  # default
    assert "id" in body


def test_create_job_missing_company_rejected(client, register_and_login):
    _, headers = register_and_login()
    resp = client.post("/jobs", json={"role": "Engineer"}, headers=headers)
    assert resp.status_code == 400


def test_create_job_invalid_status_rejected(client, register_and_login):
    _, headers = register_and_login()
    resp = client.post("/jobs", json={"company": "Acme", "status": "ghosted"}, headers=headers)
    assert resp.status_code == 400


def test_create_job_invalid_date_rejected(client, register_and_login):
    _, headers = register_and_login()
    resp = client.post(
        "/jobs", json={"company": "Acme", "date_applied": "not-a-date"}, headers=headers
    )
    assert resp.status_code == 400


# ---------- list / filter ----------

def test_list_jobs_returns_only_own_jobs(client, register_and_login):
    _, headers1 = register_and_login(email=email("listuser1"))
    _, headers2 = register_and_login(email=email("listuser2"))

    _create_job(client, headers1, company="User1 Co")
    _create_job(client, headers2, company="User2 Co")

    resp = client.get("/jobs", headers=headers1)
    assert resp.status_code == 200
    companies = [job["company"] for job in resp.json()]
    assert companies == ["User1 Co"]


def test_list_jobs_filter_by_status(client, register_and_login):
    _, headers = register_and_login()
    _create_job(client, headers, company="Applied Co")
    created = _create_job(client, headers, company="Offer Co").json()
    client.put("/jobs/" + str(created["id"]), json={"status": "offer"}, headers=headers)

    resp = client.get("/jobs?status=offer", headers=headers)
    assert resp.status_code == 200
    companies = [job["company"] for job in resp.json()]
    assert companies == ["Offer Co"]

    resp = client.get("/jobs?status=rejected", headers=headers)
    assert resp.json() == []


# ---------- get single ----------

def test_get_job_success(client, register_and_login):
    _, headers = register_and_login()
    created = _create_job(client, headers).json()
    resp = client.get("/jobs/" + str(created["id"]), headers=headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


def test_get_nonexistent_job_returns_404(client, register_and_login):
    _, headers = register_and_login()
    resp = client.get("/jobs/999999", headers=headers)
    assert resp.status_code == 404


# ---------- update ----------

def test_update_job_status_only(client, register_and_login):
    _, headers = register_and_login()
    created = _create_job(client, headers).json()

    resp = client.put("/jobs/" + str(created["id"]), json={"status": "interviewing"}, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "interviewing"
    assert body["company"] == created["company"]  # untouched fields preserved


def test_update_job_multiple_fields(client, register_and_login):
    _, headers = register_and_login()
    created = _create_job(client, headers).json()

    resp = client.put(
        "/jobs/" + str(created["id"]),
        json={"company": "Renamed Co", "notes": "Got an interview"},
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["company"] == "Renamed Co"
    assert body["notes"] == "Got an interview"


def test_update_nonexistent_job_returns_404(client, register_and_login):
    _, headers = register_and_login()
    resp = client.put("/jobs/999999", json={"status": "offer"}, headers=headers)
    assert resp.status_code == 404


def test_update_job_invalid_status_rejected(client, register_and_login):
    _, headers = register_and_login()
    created = _create_job(client, headers).json()
    resp = client.put("/jobs/" + str(created["id"]), json={"status": "ghosted"}, headers=headers)
    assert resp.status_code == 400


# ---------- delete ----------

def test_delete_job_success(client, register_and_login):
    _, headers = register_and_login()
    created = _create_job(client, headers).json()

    resp = client.delete("/jobs/" + str(created["id"]), headers=headers)
    assert resp.status_code == 204

    resp = client.get("/jobs/" + str(created["id"]), headers=headers)
    assert resp.status_code == 404


def test_delete_nonexistent_job_returns_404(client, register_and_login):
    _, headers = register_and_login()
    resp = client.delete("/jobs/999999", headers=headers)
    assert resp.status_code == 404


# ---------- cross-user access denial ----------

def test_cannot_get_another_users_job(client, register_and_login):
    _, headers1 = register_and_login(email=email("crossget1"))
    _, headers2 = register_and_login(email=email("crossget2"))

    created = _create_job(client, headers1).json()

    resp = client.get("/jobs/" + str(created["id"]), headers=headers2)
    assert resp.status_code == 404


def test_cannot_update_another_users_job(client, register_and_login):
    _, headers1 = register_and_login(email=email("crossput1"))
    _, headers2 = register_and_login(email=email("crossput2"))

    created = _create_job(client, headers1).json()

    resp = client.put("/jobs/" + str(created["id"]), json={"status": "offer"}, headers=headers2)
    assert resp.status_code == 404

    # confirm it was NOT actually modified
    resp = client.get("/jobs/" + str(created["id"]), headers=headers1)
    assert resp.json()["status"] == "applied"


def test_cannot_delete_another_users_job(client, register_and_login):
    _, headers1 = register_and_login(email=email("crossdel1"))
    _, headers2 = register_and_login(email=email("crossdel2"))

    created = _create_job(client, headers1).json()

    resp = client.delete("/jobs/" + str(created["id"]), headers=headers2)
    assert resp.status_code == 404

    # confirm it still exists for the owner
    resp = client.get("/jobs/" + str(created["id"]), headers=headers1)
    assert resp.status_code == 200
