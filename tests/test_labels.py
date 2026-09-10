from __future__ import annotations


def test_create_label_requires_actor(client):
    res = client.post("/api/labels", json={"name": "Urgent", "color": "#ff0000"})
    assert res.status_code == 401


def test_create_label(client, auth):
    res = client.post("/api/labels", json={"name": "Urgent", "color": "#ff0000"}, headers=auth)
    assert res.status_code == 201
    body = res.json()
    assert body["name"] == "Urgent"
    assert body["color"] == "#ff0000"


def test_create_label_rejects_bad_color(client, auth):
    res = client.post("/api/labels", json={"name": "Bad", "color": "#xyz"}, headers=auth)
    assert res.status_code == 422


def test_update_label_partial(client, auth):
    res = client.patch("/api/labels/label_bug", json={"color": "#111111"}, headers=auth)
    assert res.status_code == 200
    body = res.json()
    assert body["color"] == "#111111"
    assert body["name"] == "Bug"


def test_update_label_empty_body_422(client, auth):
    res = client.patch("/api/labels/label_bug", json={}, headers=auth)
    assert res.status_code == 422


def test_update_label_missing_404(client, auth):
    res = client.patch("/api/labels/label_nope", json={"name": "X"}, headers=auth)
    assert res.status_code == 404


def test_delete_label_cascades_off_cards(client, auth):
    cards_before = client.get("/api/boards/board_eng/cards").json()
    tagged = next(c for c in cards_before if "label_bug" in c["label_ids"])

    res = client.delete("/api/labels/label_bug", headers=auth)
    assert res.status_code == 204

    cards_after = client.get("/api/boards/board_eng/cards").json()
    card = next(c for c in cards_after if c["id"] == tagged["id"])
    assert "label_bug" not in card["label_ids"]
