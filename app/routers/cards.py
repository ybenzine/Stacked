from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.deps import require_actor
from app.models import Card as CardModel
from app.schemas import Card, CardPatch, CreateCardBody, MoveCardBody
from app.store import Repo, get_repo, new_id, now

router = APIRouter(tags=["Cards"])

_ARCHIVED_CONFLICT = "This card belongs to an archived board and is read-only"


def _board_cards_sorted(repo: Repo, board_id: str) -> list[CardModel]:
    return sorted(
        (c for c in repo.cards if c.board_id == board_id),
        key=lambda c: c.position,
    )


def _assert_writable(repo: Repo, card: CardModel) -> None:
    board = repo.get_board(card.board_id)
    if (board is not None and board.is_archived) or card.is_archived:
        raise HTTPException(status_code=409, detail=_ARCHIVED_CONFLICT)


@router.get("/boards/{board_id}/cards", response_model=list[Card])
def list_cards(board_id: str, repo: Repo = Depends(get_repo)) -> list[CardModel]:
    if repo.get_board(board_id) is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    return _board_cards_sorted(repo, board_id)


@router.post("/boards/{board_id}/cards", status_code=201, response_model=Card)
def create_card(
    board_id: str,
    body: CreateCardBody,
    actor: str = Depends(require_actor),
    repo: Repo = Depends(get_repo),
) -> CardModel:
    board = repo.get_board(board_id)
    if board is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    if board.is_archived:
        raise HTTPException(status_code=409, detail="Board is archived (read-only)")

    siblings = [
        c for c in repo.cards
        if c.board_id == board_id and c.status_id == body.status_id
    ]
    position = max((c.position for c in siblings), default=-1) + 1

    timestamp = now()
    card = CardModel(
        id=new_id(),
        board_id=board_id,
        status_id=body.status_id,
        title=body.title.strip(),
        description=body.description.strip(),
        assignee_id=body.assignee_id,
        creator_id=actor,
        effort_level_id=body.effort_level_id,
        label_ids=list(body.label_ids),
        position=position,
        is_archived=False,
        created_at=timestamp,
        updated_at=timestamp,
    )
    repo.add(card)
    repo.add_activity(card, actor, "created this card")
    if card.assignee_id:
        repo.add_activity(
            card, actor, f"assignee set to {repo.user_name(card.assignee_id)}"
        )
    return card


@router.patch("/cards/{card_id}", response_model=Card)
def update_card(
    card_id: str,
    body: CardPatch,
    actor: str = Depends(require_actor),
    repo: Repo = Depends(get_repo),
) -> CardModel:
    card = repo.get_card(card_id)
    if card is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    _assert_writable(repo, card)

    patch = body.model_dump(exclude_unset=True)

    if "title" in patch and patch["title"].strip() != card.title:
        card.title = patch["title"].strip()
        repo.add_activity(card, actor, f'title changed to "{card.title}"')
    if "description" in patch and patch["description"] != card.description:
        card.description = patch["description"]
        repo.add_activity(card, actor, "description updated")
    if "assignee_id" in patch and patch["assignee_id"] != card.assignee_id:
        before, after = card.assignee_id, patch["assignee_id"]
        card.assignee_id = after
        repo.add_activity(
            card,
            actor,
            f"assignee changed from {repo.user_name(before)} to {repo.user_name(after)}",
        )
    if "effort_level_id" in patch and patch["effort_level_id"] != card.effort_level_id:
        before, after = card.effort_level_id, patch["effort_level_id"]
        card.effort_level_id = after
        repo.add_activity(
            card,
            actor,
            f"effort changed from {repo.effort_name(before)} to {repo.effort_name(after)}",
        )
    if "label_ids" in patch:
        before = set(card.label_ids)
        after = set(patch["label_ids"])
        for lid in patch["label_ids"]:
            if lid not in before:
                repo.add_activity(card, actor, f'label "{repo.label_name(lid)}" added')
        for lid in card.label_ids:
            if lid not in after:
                repo.add_activity(card, actor, f'label "{repo.label_name(lid)}" removed')
        card.label_ids = list(patch["label_ids"])

    card.updated_at = now()
    return card


@router.delete("/cards/{card_id}", status_code=204, dependencies=[Depends(require_actor)])
def delete_card(card_id: str, repo: Repo = Depends(get_repo)) -> None:
    card = repo.get_card(card_id)
    if card is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    _assert_writable(repo, card)
    repo.delete(card)


@router.post("/cards/{card_id}/move", response_model=list[Card])
def move_card(
    card_id: str,
    body: MoveCardBody,
    actor: str = Depends(require_actor),
    repo: Repo = Depends(get_repo),
) -> list[CardModel]:
    card = repo.get_card(card_id)
    if card is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    _assert_writable(repo, card)

    from_status = card.status_id
    to_status = body.to_status_id

    if from_status != to_status:
        repo.add_activity(
            card,
            actor,
            f"moved from {repo.status_name(from_status)} to {repo.status_name(to_status)}",
        )
    else:
        repo.add_activity(
            card, actor, f"reordered within {repo.status_name(to_status)}"
        )

    card.status_id = to_status
    card.updated_at = now()

    board_cards = repo.cards
    column = sorted(
        (
            c for c in board_cards
            if c.board_id == card.board_id
            and c.status_id == to_status
            and c.id != card_id
        ),
        key=lambda c: c.position,
    )
    clamped = max(0, min(body.to_index, len(column)))
    column.insert(clamped, card)
    for index, c in enumerate(column):
        c.position = index

    source = sorted(
        (
            c for c in board_cards
            if c.board_id == card.board_id and c.status_id == from_status
        ),
        key=lambda c: c.position,
    )
    for index, c in enumerate(source):
        c.position = index

    return _board_cards_sorted(repo, card.board_id)
