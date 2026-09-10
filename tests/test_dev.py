from __future__ import annotations


def test_reset_wipes_and_reseeds(client, auth):
    client.post("/api/roles", json={"name": "Temp"}, headers=auth)
    assert len(client.get("/api/bootstrap").json()["roles"]) == 5

    res = client.post("/api/reset")
    assert res.status_code == 204
    assert len(client.get("/api/bootstrap").json()["roles"]) == 4


def test_reset_hidden_when_disabled(client, monkeypatch):
    from config.settings import get_settings

    get_settings.cache_clear()
    monkeypatch.setenv("STACKED_EXPOSE_DEV_RESET", "false")
    try:
        assert client.post("/api/reset").status_code == 404
    finally:
        get_settings.cache_clear()
