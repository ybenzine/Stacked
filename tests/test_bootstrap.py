from __future__ import annotations


def test_bootstrap_returns_all_reference_data(client):
    res = client.get("/api/bootstrap")
    assert res.status_code == 200
    body = res.json()
    assert set(body) == {"users", "roles", "boards", "statuses", "labels", "effortLevels"}
    assert {u["id"] for u in body["users"]} >= {"user_jane", "user_john", "user_amy", "user_raj"}
    assert {r["id"] for r in body["roles"]} == {"role_se", "role_qa", "role_po", "role_cs"}
    assert {b["id"] for b in body["boards"]} == {"board_eng", "board_mkt", "board_old"}


def test_bootstrap_statuses_and_effort_levels_sorted_by_position(client):
    body = client.get("/api/bootstrap").json()
    status_positions = [s["position"] for s in body["statuses"]]
    effort_positions = [e["position"] for e in body["effortLevels"]]
    assert status_positions == sorted(status_positions)
    assert effort_positions == sorted(effort_positions)


def test_bootstrap_needs_no_auth(client):
    assert client.get("/api/bootstrap").status_code == 200
