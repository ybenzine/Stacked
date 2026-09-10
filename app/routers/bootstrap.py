from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas import Bootstrap
from app.store import Repo, get_repo

router = APIRouter(tags=["Bootstrap"])


@router.get("/bootstrap", response_model=Bootstrap)
def get_bootstrap(repo: Repo = Depends(get_repo)) -> dict:
    return {
        "users": repo.users,
        "roles": repo.roles,
        "boards": repo.boards,
        "statuses": sorted(repo.statuses, key=lambda s: s.position),
        "labels": repo.labels,
        "effortLevels": sorted(repo.effort_levels, key=lambda e: e.position),
    }
