from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.deps import require_actor
from app.schemas import Card, CardPatch, CreateCardBody, MoveCardBody
from app.store import new_id, now, store

router = APIRouter(tags=["Cards"])

_ARCHIVED_CONFLICT = "This card belongs to an archived board and is read-only"


def _board_cards_sorted(board_id: str) -> list[dict]:
    return sorted(
        (c for c in store.cards if c["board_id"] == board_id),
        key=lambda c: c["position"],
    )


def _assert_writable(card: dict) -> None:
    board = store.get_board(card["board_id"])
    if (board is not None and board["is_archived"]) or card["is_archived"]:
        raise HTTPException(status_code=409, detail=_ARCHIVED_CONFLICT)


@router.get("/boards/{board_id}/cards", response_model=list[Card])
def list_cards(board_id: str) -> list[dict]:
    if store.get_board(board_id) is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    return _board_cards_sorted(board_id)


@router.post("/boards/{board_id}/cards", status_code=201, response_model=Card)
def create_card(board_id: str, body: CreateCardBody, actor: str = Depends(require_actor)) -> dict:
    board = store.get_board(board_id)
    if board is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    if board["is_archived"]:
        raise HTTPException(status_code=409, detail="Board is archived (read-only)")

    siblings = [
        c for c in store.cards
        if c["board_id"] == board_id and c["status_id"] == body.status_id
    ]
    position = max((c["position"] for c in siblings), default=-1) + 1

    timestamp = now()
    card = {
        "id": new_id(),
        "board_id": board_id,
        "status_id": body.status_id,
        "title": body.title.strip(),
        "description": body.description.strip(),
        "assignee_id": body.assignee_id,
        "creator_id": actor,
        "effort_level_id": body.effort_level_id,
        "label_ids": list(body.label_ids),
        "position": position,
        "is_archived": False,
        "created_at": timestamp,
        "updated_at": timestamp,
        "activity": [],
    }
    card["activity"].append(store.activity_entry(card["id"], actor, "created this card"))
    if card["assignee_id"]:
        card["activity"].append(
            store.activity_entry(
                card["id"], actor, f"assignee set to {store.user_name(card['assignee_id'])}"
            )
        )
    store.cards.append(card)
    return card


@router.patch("/cards/{card_id}", response_model=Card)
def update_card(card_id: str, body: CardPatch, actor: str = Depends(require_actor)) -> dict:
    card = store.get_card(card_id)
    if card is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    _assert_writable(card)

    patch = body.model_dump(exclude_unset=True)

    if "title" in patch and patch["title"].strip() != card["title"]:
        card["title"] = patch["title"].strip()
        card["activity"].append(
            store.activity_entry(card["id"], actor, f'title changed to "{card["title"]}"')
        )
    if "description" in patch and patch["description"] != card["description"]:
        card["description"] = patch["description"]
        card["activity"].append(
            store.activity_entry(card["id"], actor, "description updated")
        )
    if "assignee_id" in patch and patch["assignee_id"] != card["assignee_id"]:
        before, after = card["assignee_id"], patch["assignee_id"]
        card["assignee_id"] = after
        card["activity"].append(
            store.activity_entry(
                card["id"],
                actor,
                f"assignee changed from {store.user_name(before)} to {store.user_name(after)}",
            )
        )
    if "effort_level_id" in patch and patch["effort_level_id"] != card["effort_level_id"]:
        before, after = card["effort_level_id"], patch["effort_level_id"]
        card["effort_level_id"] = after
        card["activity"].append(
            store.activity_entry(
                card["id"],
                actor,
                f"effort changed from {store.effort_name(before)} to {store.effort_name(after)}",
            )
        )
    if "label_ids" in patch:
        before = set(card["label_ids"])
        after = set(patch["label_ids"])
        for lid in patch["label_ids"]:
            if lid not in before:
                card["activity"].append(
                    store.activity_entry(
                        card["id"], actor, f'label "{store.label_name(lid)}" added'
                    )
                )
        for lid in card["label_ids"]:
            if lid not in after:
                card["activity"].append(
                    store.activity_entry(
                        card["id"], actor, f'label "{store.label_name(lid)}" removed'
                    )
                )
        card["label_ids"] = list(patch["label_ids"])

    card["updated_at"] = now()
    return card


@router.delete("/cards/{card_id}", status_code=204, dependencies=[Depends(require_actor)])
def delete_card(card_id: str) -> None:
    card = store.get_card(card_id)
    if card is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    _assert_writable(card)
    store.cards = [c for c in store.cards if c["id"] != card_id]


@router.post("/cards/{card_id}/move", response_model=list[Card])
def move_card(card_id: str, body: MoveCardBody, actor: str = Depends(require_actor)) -> list[dict]:
    card = store.get_card(card_id)
    if card is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    _assert_writable(card)

    from_status = card["status_id"]
    to_status = body.to_status_id

    if from_status != to_status:
        card["activity"].append(
            store.activity_entry(
                card["id"],
                actor,
                f"moved from {store.status_name(from_status)} to {store.status_name(to_status)}",
            )
        )
    else:
        card["activity"].append(
            store.activity_entry(
                card["id"], actor, f"reordered within {store.status_name(to_status)}"
            )
        )

    card["status_id"] = to_status
    card["updated_at"] = now()

    column = sorted(
        (
            c for c in store.cards
            if c["board_id"] == card["board_id"]
            and c["status_id"] == to_status
            and c["id"] != card_id
        ),
        key=lambda c: c["position"],
    )
    clamped = max(0, min(body.to_index, len(column)))
    column.insert(clamped, card)
    for index, c in enumerate(column):
        c["position"] = index

    source = sorted(
        (
            c for c in store.cards
            if c["board_id"] == card["board_id"] and c["status_id"] == from_status
        ),
        key=lambda c: c["position"],
    )
    for index, c in enumerate(source):
        c["position"] = index

    return _board_cards_sorted(card["board_id"])
