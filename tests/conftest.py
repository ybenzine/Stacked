"""Shared test fixtures.

``config.settings_test`` is imported first, for its side effects: it sets the
test environment before the app (and its settings) are imported.
"""

from __future__ import annotations

import config.settings_test  # noqa: F401  (sets env before app import)

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.store import store

# A seeded, always-present user id — used as the acting identity for writes.
ACTOR = "user_jane"
AUTH = {"X-Actor-Id": ACTOR}


@pytest.fixture(autouse=True)
def _fresh_store() -> None:
    """Every test starts from a clean seed."""
    store.reset()
    yield
    store.reset()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def auth() -> dict[str, str]:
    return dict(AUTH)
