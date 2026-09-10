from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.deps import require_actor
from app.models import Role as RoleModel
from app.schemas import NameBody, Role
from app.store import Repo, get_repo, new_id

router = APIRouter(tags=["Roles"], dependencies=[Depends(require_actor)])


@router.post("/roles", status_code=201, response_model=Role)
def create_role(body: NameBody, repo: Repo = Depends(get_repo)) -> RoleModel:
    role = RoleModel(id=new_id(), name=body.name.strip())
    repo.add(role)
    return role


@router.patch("/roles/{role_id}", response_model=Role)
def update_role(role_id: str, body: NameBody, repo: Repo = Depends(get_repo)) -> RoleModel:
    role = repo.get_role(role_id)
    if role is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    role.name = body.name.strip()
    return role


@router.delete("/roles/{role_id}", status_code=204)
def delete_role(role_id: str, repo: Repo = Depends(get_repo)) -> None:
    role = repo.get_role(role_id)
    if role is None:
        return
    for user in repo.users:
        if user.role_id == role_id:
            user.role_id = None
    repo.delete(role)
