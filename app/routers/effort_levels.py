from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.deps import require_actor
from app.models import EffortLevel as EffortLevelModel
from app.schemas import EffortLevel, NameBody, ReorderBody
from app.store import Repo, get_repo, new_id

router = APIRouter(tags=["Effort Levels"], dependencies=[Depends(require_actor)])


def _sorted(repo: Repo) -> list[EffortLevelModel]:
    return sorted(repo.effort_levels, key=lambda e: e.position)


@router.post("/effort-levels", status_code=201, response_model=EffortLevel)
def create_effort_level(body: NameBody, repo: Repo = Depends(get_repo)) -> EffortLevelModel:
    level = EffortLevelModel(
        id=new_id(), name=body.name.strip(), position=len(repo.effort_levels)
    )
    repo.add(level)
    return level


@router.post("/effort-levels/reorder", response_model=list[EffortLevel])
def reorder_effort_levels(
    body: ReorderBody, repo: Repo = Depends(get_repo)
) -> list[EffortLevelModel]:
    for index, level_id in enumerate(body.ordered_ids):
        level = repo.get_effort_level(level_id)
        if level is not None:
            level.position = index
    return _sorted(repo)


@router.patch("/effort-levels/{effort_level_id}", response_model=EffortLevel)
def update_effort_level(
    effort_level_id: str, body: NameBody, repo: Repo = Depends(get_repo)
) -> EffortLevelModel:
    level = repo.get_effort_level(effort_level_id)
    if level is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    level.name = body.name.strip()
    return level


@router.delete("/effort-levels/{effort_level_id}", status_code=204)
def delete_effort_level(effort_level_id: str, repo: Repo = Depends(get_repo)) -> None:
    level = repo.get_effort_level(effort_level_id)
    if level is None:
        return
    for card in repo.cards:
        if card.effort_level_id == effort_level_id:
            card.effort_level_id = None
    repo.delete(level)
