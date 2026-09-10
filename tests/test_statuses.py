from __future__ import annotations


def test_create_status_appended_and_unlocked(client, auth):
    res = client.post("/api/statuses", json={"name": "Blocked"}, headers=auth)
    assert res.status_code == 201
    body = res.json()
    assert body["is_locked"] is False
    assert body["position"] == 4  # seed has 4 statuses at 0..3


def test_create_status_requires_actor(client):
    assert client.post("/api/statuses", json={"name": "Blocked"}).status_code == 401


def test_update_custom_status(client, auth):
    res = client.patch("/api/statuses/status_review", json={"name": "In Review"}, headers=auth)
    assert res.status_code == 200
    assert res.json()["name"] == "In Review"


def test_update_locked_status_409(client, auth):
    res = client.patch("/api/statuses/status_todo", json={"name": "Backlog"}, headers=auth)
    assert res.status_code == 409


def test_update_status_missing_404(client, auth):
    res = client.patch("/api/statuses/status_nope", json={"name": "X"}, headers=auth)
    assert res.status_code == 404


def test_reorder_statuses(client, auth):
    order = ["status_done", "status_review", "status_progress", "status_todo"]
    res = client.post("/api/statuses/reorder", json={"ordered_ids": order}, headers=auth)
    assert res.status_code == 200
    assert [s["id"] for s in res.json()] == order


def test_delete_locked_status_409(client, auth):
    assert client.delete("/api/statuses/status_todo", headers=auth).status_code == 409


def test_delete_status_missing_404(client, auth):
    assert client.delete("/api/statuses/status_nope", headers=auth).status_code == 404


def test_delete_custom_status_moves_cards_to_todo_and_logs(client, auth):
    before = client.get("/api/boards/board_eng/cards").json()
    review_card = next(c for c in before if c["status_id"] == "status_review")

    res = client.delete("/api/statuses/status_review", headers=auth)
    assert res.status_code == 204

    after = client.get("/api/boards/board_eng/cards").json()
    moved = next(c for c in after if c["id"] == review_card["id"])
    assert moved["status_id"] == "status_todo"
    assert any("was deleted" in e["description"] for e in moved["activity"])
    assert moved["updated_at"] >= review_card["updated_at"]

    remaining = client.get("/api/bootstrap").json()["statuses"]
    assert [s["position"] for s in remaining] == list(range(len(remaining)))
