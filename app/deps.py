"""Shared route dependencies."""

from __future__ import annotations

from fastapi import Depends, Header, HTTPException

from app.store import Repo, get_repo


def require_actor(
    x_actor_id: str | None = Header(default=None, alias="X-Actor-Id"),
    repo: Repo = Depends(get_repo),
) -> str:
    """Resolve the acting user from ``X-Actor-Id``.

    Not a credential — just attribution. Missing or unknown ids are rejected
    with ``401`` on every mutating endpoint.
    """
    if not x_actor_id or repo.get_user(x_actor_id) is None:
        raise HTTPException(status_code=401, detail="Missing or unknown X-Actor-Id")
    return x_actor_id
