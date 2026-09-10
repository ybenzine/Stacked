from __future__ import annotations


def test_create_effort_level_appended_at_last_position(client, auth):
    res = client.post("/api/effort-levels", json={"name": "Epic"}, headers=auth)
    assert res.status_code == 201
    assert res.json()["position"] == 4  # seed has 4 levels at 0..3


def test_create_effort_level_requires_actor(client):
    assert client.post("/api/effort-levels", json={"name": "Epic"}).status_code == 401


def test_update_effort_level(client, auth):
    res = client.patch("/api/effort-levels/effort_low", json={"name": "Tiny"}, headers=auth)
    assert res.status_code == 200
    assert res.json()["name"] == "Tiny"


def test_update_effort_level_missing_404(client, auth):
    res = client.patch("/api/effort-levels/effort_nope", json={"name": "X"}, headers=auth)
    assert res.status_code == 404


def test_reorder_effort_levels(client, auth):
    new_order = ["effort_highest", "effort_high", "effort_medium", "effort_low"]
    res = client.post(
        "/api/effort-levels/reorder", json={"ordered_ids": new_order}, headers=auth
    )
    assert res.status_code == 200
    body = res.json()
    assert [e["id"] for e in body] == new_order
    assert [e["position"] for e in body] == [0, 1, 2, 3]


def test_delete_effort_level_cascades_to_cards(client, auth):
    cards_before = client.get("/api/boards/board_eng/cards").json()
    card = next(c for c in cards_before if c["effort_level_id"] == "effort_medium")

    res = client.delete("/api/effort-levels/effort_medium", headers=auth)
    assert res.status_code == 204

    cards_after = client.get("/api/boards/board_eng/cards").json()
    updated = next(c for c in cards_after if c["id"] == card["id"])
    assert updated["effort_level_id"] is None
