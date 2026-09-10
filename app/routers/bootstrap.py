from __future__ import annotations

from fastapi import APIRouter

from app.schemas import Bootstrap
from app.store import store

router = APIRouter(tags=["Bootstrap"])


@router.get("/bootstrap", response_model=Bootstrap)
def get_bootstrap() -> dict:
    return {
        "users": store.users,
        "roles": store.roles,
        "boards": store.boards,
        "statuses": sorted(store.statuses, key=lambda s: s["position"]),
        "labels": store.labels,
        "effortLevels": sorted(store.effort_levels, key=lambda e: e["position"]),
    }
