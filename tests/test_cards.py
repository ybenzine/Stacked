from __future__ import annotations


def _new_card(client, auth, **overrides):
    payload = {"status_id": "status_todo", "title": "New card"}
    payload.update(overrides)
    return client.post("/api/boards/board_eng/cards", json=payload, headers=auth)


# --------------------------------------------------------------------- list
def test_list_cards_sorted_by_position(client):
    res = client.get("/api/boards/board_eng/cards")
    assert res.status_code == 200
    positions = [c["position"] for c in res.json()]
    assert positions == sorted(positions)


def test_list_cards_missing_board_404(client):
    assert client.get("/api/boards/board_nope/cards").status_code == 404


# -------------------------------------------------------------------- create
def test_create_card_requires_actor(client):
    res = client.post(
        "/api/boards/board_eng/cards", json={"status_id": "status_todo", "title": "x"}
    )
    assert res.status_code == 401


def test_create_card_sets_creator_position_and_activity(client, auth):
    res = _new_card(client, auth, title="  Trimmed  ")
    assert res.status_code == 201
    body = res.json()
    assert body["title"] == "Trimmed"
    assert body["creator_id"] == "user_jane"
    assert body["board_id"] == "board_eng"
    assert body["position"] == 2  # two seed cards already in To Do (positions 0, 1)
    assert any(e["description"] == "created this card" for e in body["activity"])


def test_create_card_with_assignee_logs_assignment(client, auth):
    body = _new_card(client, auth, assignee_id="user_amy").json()
    assert any("assignee set to Amy Wong" in e["description"] for e in body["activity"])


def test_create_card_on_archived_board_409(client, auth):
    res = client.post(
        "/api/boards/board_old/cards",
        json={"status_id": "status_todo", "title": "x"},
        headers=auth,
    )
    assert res.status_code == 409


def test_create_card_missing_board_404(client, auth):
    res = client.post(
        "/api/boards/board_nope/cards",
        json={"status_id": "status_todo", "title": "x"},
        headers=auth,
    )
    assert res.status_code == 404


# -------------------------------------------------------------------- update
def test_update_card_changes_field_and_logs(client, auth):
    card_id = _new_card(client, auth).json()["id"]
    res = client.patch(f"/api/cards/{card_id}", json={"title": "Renamed"}, headers=auth)
    assert res.status_code == 200
    body = res.json()
    assert body["title"] == "Renamed"
    assert any('title changed to "Renamed"' in e["description"] for e in body["activity"])
    assert body["updated_at"] >= body["created_at"]


def test_update_card_label_diff_logged(client, auth):
    card_id = _new_card(client, auth, label_ids=["label_bug"]).json()["id"]
    res = client.patch(
        f"/api/cards/{card_id}", json={"label_ids": ["label_feature"]}, headers=auth
    )
    body = res.json()
    descs = [e["description"] for e in body["activity"]]
    assert any('label "Feature" added' in d for d in descs)
    assert any('label "Bug" removed' in d for d in descs)
    assert body["label_ids"] == ["label_feature"]


def test_update_card_empty_body_422(client, auth):
    card_id = _new_card(client, auth).json()["id"]
    assert client.patch(f"/api/cards/{card_id}", json={}, headers=auth).status_code == 422


def test_update_card_missing_404(client, auth):
    res = client.patch("/api/cards/id_nope", json={"title": "x"}, headers=auth)
    assert res.status_code == 404


def test_update_card_on_archived_board_409(client, auth):
    archived = client.get("/api/boards/board_old/cards").json()[0]
    res = client.patch(
        f"/api/cards/{archived['id']}", json={"title": "x"}, headers=auth
    )
    assert res.status_code == 409


def test_update_card_requires_actor(client, auth):
    card_id = _new_card(client, auth).json()["id"]
    assert client.patch(f"/api/cards/{card_id}", json={"title": "x"}).status_code == 401


# -------------------------------------------------------------------- delete
def test_delete_card(client, auth):
    card_id = _new_card(client, auth).json()["id"]
    assert client.delete(f"/api/cards/{card_id}", headers=auth).status_code == 204
    remaining = client.get("/api/boards/board_eng/cards").json()
    assert all(c["id"] != card_id for c in remaining)


def test_delete_card_missing_404(client, auth):
    assert client.delete("/api/cards/id_nope", headers=auth).status_code == 404


def test_delete_card_on_archived_board_409(client, auth):
    archived = client.get("/api/boards/board_old/cards").json()[0]
    assert client.delete(f"/api/cards/{archived['id']}", headers=auth).status_code == 409


# ---------------------------------------------------------------------- move
def test_move_card_across_columns_returns_board_list(client, auth):
    todo = [c for c in client.get("/api/boards/board_eng/cards").json()
            if c["status_id"] == "status_todo"]
    card = todo[0]

    res = client.post(
        f"/api/cards/{card['id']}/move",
        json={"to_status_id": "status_progress", "to_index": 0},
        headers=auth,
    )
    assert res.status_code == 200
    board = res.json()
    moved = next(c for c in board if c["id"] == card["id"])
    assert moved["status_id"] == "status_progress"
    assert moved["position"] == 0
    assert any("moved from To Do to In Progress" in e["description"] for e in moved["activity"])

    progress = sorted(
        (c for c in board if c["status_id"] == "status_progress"),
        key=lambda c: c["position"],
    )
    assert [c["position"] for c in progress] == list(range(len(progress)))


def test_move_card_within_column_logs_reorder(client, auth):
    todo = [c for c in client.get("/api/boards/board_eng/cards").json()
            if c["status_id"] == "status_todo"]
    card = todo[0]
    res = client.post(
        f"/api/cards/{card['id']}/move",
        json={"to_status_id": "status_todo", "to_index": 5},
        headers=auth,
    )
    assert res.status_code == 200
    moved = next(c for c in res.json() if c["id"] == card["id"])
    assert any("reordered within To Do" in e["description"] for e in moved["activity"])


def test_move_card_index_is_clamped(client, auth):
    todo = [c for c in client.get("/api/boards/board_eng/cards").json()
            if c["status_id"] == "status_todo"]
    card = todo[0]
    board = client.post(
        f"/api/cards/{card['id']}/move",
        json={"to_status_id": "status_done", "to_index": 999},
        headers=auth,
    ).json()
    done = sorted(
        (c for c in board if c["status_id"] == "status_done"), key=lambda c: c["position"]
    )
    assert done[-1]["id"] == card["id"]


def test_move_card_missing_404(client, auth):
    res = client.post(
        "/api/cards/id_nope/move",
        json={"to_status_id": "status_done", "to_index": 0},
        headers=auth,
    )
    assert res.status_code == 404


def test_move_card_on_archived_board_409(client, auth):
    archived = client.get("/api/boards/board_old/cards").json()[0]
    res = client.post(
        f"/api/cards/{archived['id']}/move",
        json={"to_status_id": "status_todo", "to_index": 0},
        headers=auth,
    )
    assert res.status_code == 409


def test_move_card_requires_actor(client, auth):
    card = client.get("/api/boards/board_eng/cards").json()[0]
    res = client.post(
        f"/api/cards/{card['id']}/move",
        json={"to_status_id": "status_done", "to_index": 0},
    )
    assert res.status_code == 401
