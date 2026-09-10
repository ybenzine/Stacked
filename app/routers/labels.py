from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.deps import require_actor
from app.models import Label as LabelModel
from app.schemas import CreateLabelBody, Label, UpdateLabelBody
from app.store import Repo, get_repo, new_id

router = APIRouter(tags=["Labels"], dependencies=[Depends(require_actor)])


@router.post("/labels", status_code=201, response_model=Label)
def create_label(body: CreateLabelBody, repo: Repo = Depends(get_repo)) -> LabelModel:
    label = LabelModel(id=new_id(), name=body.name.strip(), color=body.color)
    repo.add(label)
    return label


@router.patch("/labels/{label_id}", response_model=Label)
def update_label(
    label_id: str, body: UpdateLabelBody, repo: Repo = Depends(get_repo)
) -> LabelModel:
    label = repo.get_label(label_id)
    if label is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    fields = body.model_dump(exclude_unset=True)
    if "name" in fields:
        label.name = fields["name"].strip()
    if "color" in fields:
        label.color = fields["color"]
    return label


@router.delete("/labels/{label_id}", status_code=204)
def delete_label(label_id: str, repo: Repo = Depends(get_repo)) -> None:
    label = repo.get_label(label_id)
    for card in repo.cards:
        if label_id in card.label_ids:
            card.label_ids = [x for x in card.label_ids if x != label_id]
    if label is not None:
        repo.delete(label)
