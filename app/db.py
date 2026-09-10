"""Database engine, session factory, and schema bootstrap.

The connection target comes from ``STACKED_DATABASE_URL`` (a SQLAlchemy URL, see
``config/settings.py``). It defaults to a local SQLite file, but nothing in the
app is SQLite-specific — point the URL at Postgres or MySQL later and the rest
of the code is unchanged.
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from config.settings import get_settings


class Base(DeclarativeBase):
    pass


def new_id() -> str:
    return "id_" + uuid4().hex[:12]


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _engine_kwargs(url: str) -> dict:
    """Driver-specific engine tuning, kept in one place so the rest of the app
    stays database-agnostic."""
    if not url.startswith("sqlite"):
        return {}
    kwargs: dict = {"connect_args": {"check_same_thread": False}}
    # An in-memory SQLite database lives inside a single connection; share one
    # so every session (and the test client's threads) sees the same data.
    if url in ("sqlite://", "sqlite:///:memory:"):
        kwargs["poolclass"] = StaticPool
    return kwargs


_url = get_settings().database_url
engine = create_engine(_url, **_engine_kwargs(_url))
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def init_db(*, seed: bool = True) -> None:
    """Create any missing tables and, unless the database already has data,
    load the seed fixture."""
    from app import models  # noqa: F401 — registers the mappers on ``Base``

    Base.metadata.create_all(engine)
    if not seed:
        return
    with SessionLocal() as session:
        empty = session.scalar(select(func.count()).select_from(models.Role)) == 0
        if empty:
            session.add_all(models.seed_objects())
            session.commit()


def get_session() -> Iterator[Session]:
    """FastAPI dependency: one session per request, committed on success."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
