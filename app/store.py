"""Data access for the routers.

``Repo`` wraps a single SQLAlchemy :class:`~sqlalchemy.orm.Session` and exposes
the small set of lookups and helpers the routers need. Routers get a
request-scoped instance through :func:`get_repo`; the process-wide ``store``
object only carries :meth:`Database.reset`, used by the dev endpoint and tests.
"""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.orm import Session

# Re-exported for routers that still import these from ``app.store``.
from app.db import SessionLocal, get_session, new_id, now  # noqa: F401
from app.models import (
    DEFAULT_BOARD_THEME,  # noqa: F401
    ActivityLogEntry,
    Board,
    Card,
    EffortLevel,
    Label,
    Role,
    Status,
    User,
)

# Child-before-parent, so the activity_log FK never blocks a wipe.
_ALL_MODELS = (ActivityLogEntry, Card, Board, EffortLevel, Label, Status, User, Role)


class Repo:
    def __init__(self, session: Session) -> None:
        self.session = session

    # -- unit of work ---------------------------------------------------------
    def add(self, obj: object) -> None:
        self.session.add(obj)

    def delete(self, obj: object) -> None:
        self.session.delete(obj)

    # -- collections --------------------------------------------------------
    def _all(self, model):
        return list(self.session.scalars(select(model)))

    @property
    def users(self) -> list[User]:
        return self._all(User)

    @property
    def roles(self) -> list[Role]:
        return self._all(Role)

    @property
    def boards(self) -> list[Board]:
        return self._all(Board)

    @property
    def statuses(self) -> list[Status]:
        return self._all(Status)

    @property
    def labels(self) -> list[Label]:
        return self._all(Label)

    @property
    def effort_levels(self) -> list[EffortLevel]:
        return self._all(EffortLevel)

    @property
    def cards(self) -> list[Card]:
        return self._all(Card)

    # -- lookups ----------------------------------------------------------
    def get_user(self, id_: str) -> User | None:
        return self.session.get(User, id_)

    def get_role(self, id_: str) -> Role | None:
        return self.session.get(Role, id_)

    def get_label(self, id_: str) -> Label | None:
        return self.session.get(Label, id_)

    def get_effort_level(self, id_: str) -> EffortLevel | None:
        return self.session.get(EffortLevel, id_)

    def get_status(self, id_: str) -> Status | None:
        return self.session.get(Status, id_)

    def get_board(self, id_: str) -> Board | None:
        return self.session.get(Board, id_)

    def get_card(self, id_: str) -> Card | None:
        return self.session.get(Card, id_)

    def find_user_by_email(self, email: str) -> User | None:
        needle = email.strip().lower()
        return next(
            (u for u in self.users if u.email.strip().lower() == needle), None
        )

    # -- name helpers for activity-log copy ------------------------------
    def user_name(self, id_: str | None) -> str:
        if not id_:
            return "—"
        u = self.get_user(id_)
        return u.name if u else "—"

    def effort_name(self, id_: str | None) -> str:
        if not id_:
            return "—"
        e = self.get_effort_level(id_)
        return e.name if e else "—"

    def label_name(self, id_: str) -> str:
        lbl = self.get_label(id_)
        return lbl.name if lbl else "?"

    def status_name(self, id_: str) -> str:
        s = self.get_status(id_)
        return s.name if s else "?"

    def add_activity(self, card: Card, user_id: str | None, description: str) -> None:
        card.activity.append(
            ActivityLogEntry(
                id=new_id(),
                card_id=card.id,
                user_id=user_id,
                description=description,
                created_at=now(),
            )
        )


def get_repo(session: Session = Depends(get_session)) -> Repo:
    return Repo(session)


class Database:
    """Process-wide handle for whole-database operations."""

    def reset(self) -> None:
        """Wipe every table and reload the seed fixture."""
        from app.models import seed_objects

        with SessionLocal() as session:
            for model in _ALL_MODELS:
                session.execute(sa_delete(model))
            session.add_all(seed_objects())
            session.commit()


store = Database()
