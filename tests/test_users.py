from __future__ import annotations


def test_find_user_by_email_case_insensitive(client):
    res = client.get("/api/users/by-email", params={"email": "  JANE@example.com "})
    assert res.status_code == 200
    assert res.json()["id"] == "user_jane"


def test_find_user_by_email_missing_returns_404_with_message(client):
    res = client.get("/api/users/by-email", params={"email": "nobody@example.com"})
    assert res.status_code == 404
    assert "message" in res.json()


def test_create_user_new_returns_201(client):
    payload = {
        "name": "Nora New",
        "email": "nora@example.com",
        "role_id": "role_se",
        "color": "#123abc",
        "emoji": "\U0001f680",
    }
    res = client.post("/api/users", json=payload)
    assert res.status_code == 201
    body = res.json()
    assert body["id"].startswith("id_")
    assert body["is_active"] is True
    assert body["email"] == "nora@example.com"


def test_create_user_existing_email_reattaches_with_200(client):
    payload = {
        "name": "Jane Renamed",
        "email": "JANE@example.com",
        "role_id": "role_po",
        "color": "#000000",
        "emoji": "\U0001f31f",
    }
    res = client.post("/api/users", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["id"] == "user_jane"
    assert body["name"] == "Jane Renamed"
    assert body["role_id"] == "role_po"
    assert body["is_active"] is True


def test_create_user_reactivates_inactive_profile(client):
    payload = {
        "name": "Raj Patel",
        "email": "raj@example.com",
        "role_id": "role_cs",
        "color": "#ea580c",
        "emoji": "\U0001f422",
    }
    res = client.post("/api/users", json=payload)
    assert res.status_code == 200
    assert res.json()["is_active"] is True


def test_create_user_rejects_bad_color(client):
    payload = {
        "name": "Bad Color",
        "email": "bad@example.com",
        "role_id": None,
        "color": "red",
        "emoji": "x",
    }
    assert client.post("/api/users", json=payload).status_code == 422


def test_set_user_active_requires_actor(client):
    res = client.patch("/api/users/user_john", json={"is_active": False})
    assert res.status_code == 401


def test_set_user_active_rejects_unknown_actor(client):
    res = client.patch(
        "/api/users/user_john",
        json={"is_active": False},
        headers={"X-Actor-Id": "id_ghost"},
    )
    assert res.status_code == 401


def test_set_user_active_toggles(client, auth):
    res = client.patch("/api/users/user_john", json={"is_active": False}, headers=auth)
    assert res.status_code == 200
    assert res.json()["is_active"] is False


def test_set_user_active_unknown_user_404(client, auth):
    res = client.patch("/api/users/id_nope", json={"is_active": True}, headers=auth)
    assert res.status_code == 404
