from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response

from app.deps import require_actor
from app.models import User as UserModel
from app.schemas import NewUserInput, SetUserActiveBody, User
from app.store import Repo, get_repo, new_id

router = APIRouter(tags=["Users"])


@router.get("/users/by-email", response_model=User)
def find_user_by_email(email: str, repo: Repo = Depends(get_repo)) -> UserModel:
    user = repo.find_user_by_email(email)
    if user is None:
        raise HTTPException(status_code=404, detail="No user with that email")
    return user


@router.post("/users", status_code=201, response_model=User)
def create_user(
    body: NewUserInput, response: Response, repo: Repo = Depends(get_repo)
) -> UserModel:
    existing = repo.find_user_by_email(body.email)
    if existing is not None:
        existing.name = body.name
        existing.role_id = body.role_id
        existing.color = body.color
        existing.emoji = body.emoji
        existing.is_active = True
        response.status_code = 200
        return existing

    user = UserModel(
        id=new_id(),
        name=body.name,
        email=body.email,
        role_id=body.role_id,
        color=body.color,
        emoji=body.emoji,
        is_active=True,
    )
    repo.add(user)
    return user


@router.patch(
    "/users/{user_id}",
    response_model=User,
    dependencies=[Depends(require_actor)],
)
def set_user_active(
    user_id: str, body: SetUserActiveBody, repo: Repo = Depends(get_repo)
) -> UserModel:
    user = repo.get_user(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Resource does not exist")
    user.is_active = body.is_active
    return user
