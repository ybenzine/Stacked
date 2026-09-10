from __future__ import annotations


def test_create_role_requires_actor(client):
    assert client.post("/api/roles", json={"name": "Designer"}).status_code == 401


def test_create_role(client, auth):
    res = client.post("/api/roles", json={"name": "  Designer  "}, headers=auth)
    assert res.status_code == 201
    body = res.json()
    assert body["name"] == "Designer"
    assert body["id"].startswith("id_")


def test_update_role(client, auth):
    res = client.patch("/api/roles/role_qa", json={"name": "Quality"}, headers=auth)
    assert res.status_code == 200
    assert res.json()["name"] == "Quality"


def test_update_role_missing_404(client, auth):
    res = client.patch("/api/roles/role_nope", json={"name": "X"}, headers=auth)
    assert res.status_code == 404


def test_delete_role_cascades_to_users(client, auth):
    res = client.delete("/api/roles/role_se", headers=auth)
    assert res.status_code == 204
    users = client.get("/api/bootstrap").json()["users"]
    jane = next(u for u in users if u["id"] == "user_jane")
    assert jane["role_id"] is None
    assert all(r["id"] != "role_se" for r in client.get("/api/bootstrap").json()["roles"])


def test_delete_role_requires_actor(client):
    assert client.delete("/api/roles/role_se").status_code == 401
