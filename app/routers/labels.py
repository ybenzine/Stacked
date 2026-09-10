from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.deps import require_actor
from app.schemas import CreateLabelBody, Label, UpdateLabelBody
from app.store import new_id, store

router = APIRouter(tags=["Labels"], dependencies=[Depends(require_actor)])


@router.post("/labels", status_code=201, response_model=Label)
def create_label(body: CreateLabelBody) -> dict:
    label = {"id": new_id(), "name": body.name.strip(), "color": body.color}
    store.labels.append(label)
    return label


@router.patch("/labels/{label_id}", response_model=Label)
def update_label(label_id: str, body: UpdateLabelBody) -> dict:
    label = store.get_label(label_id)
    if label is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    fields = body.model_dump(exclude_unset=True)
    if "name" in fields:
        label["name"] = fields["name"].strip()
    if "color" in fields:
        label["color"] = fields["color"]
    return label


@router.delete("/labels/{label_id}", status_code=204)
def delete_label(label_id: str) -> None:
    store.labels = [x for x in store.labels if x["id"] != label_id]
    for card in store.cards:
        if label_id in card["label_ids"]:
            card["label_ids"] = [x for x in card["label_ids"] if x != label_id]
