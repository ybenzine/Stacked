from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.deps import require_actor
from app.schemas import NameBody, Role
from app.store import new_id, store

router = APIRouter(tags=["Roles"], dependencies=[Depends(require_actor)])


@router.post("/roles", status_code=201, response_model=Role)
def create_role(body: NameBody) -> dict:
    role = {"id": new_id(), "name": body.name.strip()}
    store.roles.append(role)
    return role


@router.patch("/roles/{role_id}", response_model=Role)
def update_role(role_id: str, body: NameBody) -> dict:
    role = store.get_role(role_id)
    if role is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    role["name"] = body.name.strip()
    return role


@router.delete("/roles/{role_id}", status_code=204)
def delete_role(role_id: str) -> None:
    store.roles = [r for r in store.roles if r["id"] != role_id]
    for user in store.users:
        if user["role_id"] == role_id:
            user["role_id"] = None
