from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.deps import require_actor
from app.schemas import EffortLevel, NameBody, ReorderBody
from app.store import new_id, store

router = APIRouter(tags=["Effort Levels"], dependencies=[Depends(require_actor)])


def _sorted() -> list[dict]:
    return sorted(store.effort_levels, key=lambda e: e["position"])


@router.post("/effort-levels", status_code=201, response_model=EffortLevel)
def create_effort_level(body: NameBody) -> dict:
    level = {"id": new_id(), "name": body.name.strip(), "position": len(store.effort_levels)}
    store.effort_levels.append(level)
    return level


@router.post("/effort-levels/reorder", response_model=list[EffortLevel])
def reorder_effort_levels(body: ReorderBody) -> list[dict]:
    for index, level_id in enumerate(body.ordered_ids):
        level = store.get_effort_level(level_id)
        if level is not None:
            level["position"] = index
    return _sorted()


@router.patch("/effort-levels/{effort_level_id}", response_model=EffortLevel)
def update_effort_level(effort_level_id: str, body: NameBody) -> dict:
    level = store.get_effort_level(effort_level_id)
    if level is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    level["name"] = body.name.strip()
    return level


@router.delete("/effort-levels/{effort_level_id}", status_code=204)
def delete_effort_level(effort_level_id: str) -> None:
    store.effort_levels = [x for x in store.effort_levels if x["id"] != effort_level_id]
    for card in store.cards:
        if card["effort_level_id"] == effort_level_id:
            card["effort_level_id"] = None
