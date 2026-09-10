from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.deps import require_actor
from app.models import Status as StatusModel
from app.schemas import NameBody, ReorderBody, Status
from app.store import Repo, get_repo, new_id, now

router = APIRouter(tags=["Statuses"], dependencies=[Depends(require_actor)])

_LOCKED_CONFLICT = "Locked base statuses cannot be modified"


def _sorted(repo: Repo) -> list[StatusModel]:
    return sorted(repo.statuses, key=lambda s: s.position)


@router.post("/statuses", status_code=201, response_model=Status)
def create_status(body: NameBody, repo: Repo = Depends(get_repo)) -> StatusModel:
    status = StatusModel(
        id=new_id(),
        name=body.name.strip(),
        position=len(repo.statuses),
        is_locked=False,
    )
    repo.add(status)
    return status


@router.post("/statuses/reorder", response_model=list[Status])
def reorder_statuses(body: ReorderBody, repo: Repo = Depends(get_repo)) -> list[StatusModel]:
    for index, status_id in enumerate(body.ordered_ids):
        status = repo.get_status(status_id)
        if status is not None:
            status.position = index
    return _sorted(repo)


@router.patch("/statuses/{status_id}", response_model=Status)
def update_status(
    status_id: str, body: NameBody, repo: Repo = Depends(get_repo)
) -> StatusModel:
    status = repo.get_status(status_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    if status.is_locked:
        raise HTTPException(status_code=409, detail=_LOCKED_CONFLICT)
    status.name = body.name.strip()
    return status


@router.delete("/statuses/{status_id}", status_code=204)
def delete_status(
    status_id: str, actor: str = Depends(require_actor), repo: Repo = Depends(get_repo)
) -> None:
    status = repo.get_status(status_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    if status.is_locked:
        raise HTTPException(status_code=409, detail=_LOCKED_CONFLICT)

    todo = next((s for s in repo.statuses if s.name == "To Do"), None)
    if todo is None:  # pragma: no cover - base status is always present
        raise HTTPException(status_code=409, detail="Missing base To Do status")

    for card in repo.cards:
        if card.status_id == status_id:
            card.status_id = todo.id
            card.updated_at = now()
            repo.add_activity(
                card, actor, f'status "{status.name}" was deleted — moved to To Do'
            )

    repo.delete(status)
    for index, s in enumerate(sorted(
        (s for s in repo.statuses if s.id != status_id), key=lambda s: s.position
    )):
        s.position = index
