from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.store import store
from config.settings import get_settings

router = APIRouter(tags=["Dev"])


@router.post("/reset", status_code=204)
def reset_all() -> None:
    if not get_settings().expose_dev_reset:
        raise HTTPException(status_code=404, detail="Not found")
    store.reset()
