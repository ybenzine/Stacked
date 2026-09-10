"""Environment for the test suite.

Imported for its side effects by ``tests/conftest.py`` before the app is
loaded. It sets the env vars the tests need so that ``config/settings.py``
picks them up, keeping production defaults untouched.
"""

from __future__ import annotations

import os

os.environ.setdefault("STACKED_ENV", "test")
os.environ.setdefault("STACKED_EXPOSE_DEV_RESET", "true")
os.environ.setdefault("STACKED_DATABASE_URL", "sqlite://")  # shared in-memory

from config.settings import get_settings  # noqa: E402

get_settings.cache_clear()
