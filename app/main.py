"""Stacked API — FastAPI application backed by a SQLAlchemy database."""

from __future__ import annotations

from fastapi import FastAPI

from app.db import init_db
from app.errors import register_error_handlers
from app.routers import (
    boards,
    bootstrap,
    cards,
    dev,
    effort_levels,
    labels,
    roles,
    statuses,
    users,
)

_ROUTERS = (
    bootstrap,
    users,
    roles,
    labels,
    effort_levels,
    statuses,
    boards,
    cards,
    dev,
)


def create_app() -> FastAPI:
    init_db()
    app = FastAPI(
        title="Stacked API",
        version="1.0.0",
        description="Backend for the Stacked Kanban frontend.",
    )
    register_error_handlers(app)
    for module in _ROUTERS:
        app.include_router(module.router, prefix="/api")
    return app


app = create_app()
