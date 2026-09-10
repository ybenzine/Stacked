from __future__ import annotations


def test_create_board_defaults(client, auth):
    res = client.post("/api/boards", json={"name": "Q4 Planning"}, headers=auth)
    assert res.status_code == 201
    body = res.json()
    assert body["is_archived"] is False
    assert body["theme"] == {"base_color": "#2f7fe4", "secondary_color": "#f7c948"}


def test_create_board_requires_actor(client):
    assert client.post("/api/boards", json={"name": "X"}).status_code == 401


def test_rename_board(client, auth):
    res = client.patch("/api/boards/board_eng", json={"name": "Eng"}, headers=auth)
    assert res.status_code == 200
    assert res.json()["name"] == "Eng"


def test_set_board_theme(client, auth):
    theme = {"base_color": "#16a34a", "secondary_color": "#d97706"}
    res = client.patch("/api/boards/board_eng", json={"theme": theme}, headers=auth)
    assert res.status_code == 200
    assert res.json()["theme"] == theme


def test_update_board_empty_body_422(client, auth):
    assert client.patch("/api/boards/board_eng", json={}, headers=auth).status_code == 422


def test_update_board_missing_404(client, auth):
    res = client.patch("/api/boards/board_nope", json={"name": "X"}, headers=auth)
    assert res.status_code == 404


def test_archive_board_wrong_confirm_name_422(client, auth):
    res = client.post(
        "/api/boards/board_eng/archive", json={"confirm_name": "wrong"}, headers=auth
    )
    assert res.status_code == 422


def test_archive_board_marks_board_and_cards(client, auth):
    res = client.post(
        "/api/boards/board_eng/archive",
        json={"confirm_name": " Engineering "},
        headers=auth,
    )
    assert res.status_code == 200
    assert res.json()["is_archived"] is True
    cards = client.get("/api/boards/board_eng/cards").json()
    assert cards and all(c["is_archived"] for c in cards)


def test_archive_board_missing_404(client, auth):
    res = client.post(
        "/api/boards/board_nope/archive", json={"confirm_name": "x"}, headers=auth
    )
    assert res.status_code == 404


def test_unarchive_board_clears_flags(client, auth):
    res = client.post("/api/boards/board_old/unarchive", headers=auth)
    assert res.status_code == 200
    assert res.json()["is_archived"] is False
    cards = client.get("/api/boards/board_old/cards").json()
    assert all(not c["is_archived"] for c in cards)
