from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.deps import require_actor
from app.schemas import ArchiveBoardBody, Board, NameBody, UpdateBoardBody
from app.store import DEFAULT_BOARD_THEME, new_id, store

router = APIRouter(tags=["Boards"], dependencies=[Depends(require_actor)])


def _set_archived(board: dict, archived: bool) -> None:
    board["is_archived"] = archived
    for card in store.cards:
        if card["board_id"] == board["id"]:
            card["is_archived"] = archived


@router.post("/boards", status_code=201, response_model=Board)
def create_board(body: NameBody) -> dict:
    board = {
        "id": new_id(),
        "name": body.name.strip(),
        "is_archived": False,
        "theme": dict(DEFAULT_BOARD_THEME),
    }
    store.boards.append(board)
    return board


@router.patch("/boards/{board_id}", response_model=Board)
def update_board(board_id: str, body: UpdateBoardBody) -> dict:
    board = store.get_board(board_id)
    if board is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    fields = body.model_dump(exclude_unset=True)
    if "name" in fields:
        board["name"] = fields["name"].strip()
    if "theme" in fields:
        board["theme"] = fields["theme"]
    return board


@router.post("/boards/{board_id}/archive", response_model=Board)
def archive_board(board_id: str, body: ArchiveBoardBody) -> dict:
    board = store.get_board(board_id)
    if board is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    if body.confirm_name.strip() != board["name"]:
        raise HTTPException(
            status_code=422, detail="Confirmation text does not match the board name"
        )
    _set_archived(board, True)
    return board


@router.post("/boards/{board_id}/unarchive", response_model=Board)
def unarchive_board(board_id: str) -> dict:
    board = store.get_board(board_id)
    if board is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    _set_archived(board, False)
    return board
