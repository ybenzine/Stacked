from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.deps import require_actor
from app.schemas import NameBody, ReorderBody, Status
from app.store import new_id, now, store

router = APIRouter(tags=["Statuses"], dependencies=[Depends(require_actor)])

_LOCKED_CONFLICT = "Locked base statuses cannot be modified"


def _sorted() -> list[dict]:
    return sorted(store.statuses, key=lambda s: s["position"])


@router.post("/statuses", status_code=201, response_model=Status)
def create_status(body: NameBody) -> dict:
    status = {
        "id": new_id(),
        "name": body.name.strip(),
        "position": len(store.statuses),
        "is_locked": False,
    }
    store.statuses.append(status)
    return status


@router.post("/statuses/reorder", response_model=list[Status])
def reorder_statuses(body: ReorderBody) -> list[dict]:
    for index, status_id in enumerate(body.ordered_ids):
        status = store.get_status(status_id)
        if status is not None:
            status["position"] = index
    return _sorted()


@router.patch("/statuses/{status_id}", response_model=Status)
def update_status(status_id: str, body: NameBody) -> dict:
    status = store.get_status(status_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    if status["is_locked"]:
        raise HTTPException(status_code=409, detail=_LOCKED_CONFLICT)
    status["name"] = body.name.strip()
    return status


@router.delete("/statuses/{status_id}", status_code=204)
def delete_status(status_id: str, actor: str = Depends(require_actor)) -> None:
    status = store.get_status(status_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    if status["is_locked"]:
        raise HTTPException(status_code=409, detail=_LOCKED_CONFLICT)

    todo = next((s for s in store.statuses if s["name"] == "To Do"), None)
    if todo is None:  # pragma: no cover - base status is always present
        raise HTTPException(status_code=409, detail="Missing base To Do status")

    for card in store.cards:
        if card["status_id"] == status_id:
            card["status_id"] = todo["id"]
            card["updated_at"] = now()
            card["activity"].append(
                store.activity_entry(
                    card["id"],
                    actor,
                    f'status "{status["name"]}" was deleted — moved to To Do',
                )
            )

    store.statuses = [s for s in store.statuses if s["id"] != status_id]
    for index, s in enumerate(_sorted()):
        s["position"] = index
