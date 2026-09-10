"""ORM models and the seed fixture.

Column names mirror the wire schema in ``openapi.yaml`` one-for-one, so a model
instance serializes straight through the Pydantic response models (which set
``from_attributes=True``). Cross-entity references are plain string columns, not
foreign keys — cascades are handled explicitly in the routers, matching the
product spec, and it keeps the schema portable across databases.
"""

from __future__ import annotations

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String
from sqlalchemy.ext.mutable import MutableDict, MutableList
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, new_id, now

DEFAULT_BOARD_THEME = {"base_color": "#2f7fe4", "secondary_color": "#f7c948"}
_SUNSET_THEME = {"base_color": "#ea580c", "secondary_color": "#db2777"}
_SLATE_THEME = {"base_color": "#475569", "secondary_color": "#0ea5e9"}


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String)
    role_id: Mapped[str | None] = mapped_column(String, nullable=True)
    color: Mapped[str] = mapped_column(String)
    emoji: Mapped[str] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Status(Base):
    __tablename__ = "statuses"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    position: Mapped[int] = mapped_column(Integer, default=0)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False)


class Label(Base):
    __tablename__ = "labels"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    color: Mapped[str] = mapped_column(String)


class EffortLevel(Base):
    __tablename__ = "effort_levels"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    position: Mapped[int] = mapped_column(Integer, default=0)


class Board(Base):
    __tablename__ = "boards"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    theme: Mapped[dict] = mapped_column(MutableDict.as_mutable(JSON), default=dict)


class ActivityLogEntry(Base):
    __tablename__ = "activity_log"

    # ``seq`` gives entries a stable insertion order; ``id`` is the wire id.
    seq: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id: Mapped[str] = mapped_column(String, unique=True, default=new_id)
    card_id: Mapped[str] = mapped_column(ForeignKey("cards.id"))
    user_id: Mapped[str | None] = mapped_column(String, nullable=True)
    description: Mapped[str] = mapped_column(String)
    created_at: Mapped[str] = mapped_column(String, default=now)


class Card(Base):
    __tablename__ = "cards"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    board_id: Mapped[str] = mapped_column(String)
    status_id: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String, default="")
    description: Mapped[str] = mapped_column(String, default="")
    assignee_id: Mapped[str | None] = mapped_column(String, nullable=True)
    creator_id: Mapped[str | None] = mapped_column(String, nullable=True)
    effort_level_id: Mapped[str | None] = mapped_column(String, nullable=True)
    label_ids: Mapped[list[str]] = mapped_column(
        MutableList.as_mutable(JSON), default=list
    )
    position: Mapped[int] = mapped_column(Integer, default=0)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[str] = mapped_column(String, default=now)
    updated_at: Mapped[str] = mapped_column(String, default=now)
    activity: Mapped[list[ActivityLogEntry]] = relationship(
        cascade="all, delete-orphan",
        order_by="ActivityLogEntry.seq",
        lazy="selectin",
    )


# --------------------------------------------------------------------------- seed
def seed_objects() -> list[Base]:
    """Fresh ORM instances for a clean database.

    Mirrors ``frontend/src/api/seed.ts`` so the API matches the mock the
    frontend was built against.
    """
    roles = [
        Role(id="role_se", name="Software Engineer"),
        Role(id="role_qa", name="QA Engineer"),
        Role(id="role_po", name="Product Owner"),
        Role(id="role_cs", name="Customer Success"),
    ]

    users = [
        User(id="user_jane", name="Jane Doe", email="jane@example.com",
             role_id="role_se", color="#4f46e5", emoji="\U0001f98a", is_active=True),
        User(id="user_john", name="John Smith", email="john@example.com",
             role_id="role_qa", color="#0891b2", emoji="\U0001f419", is_active=True),
        User(id="user_amy", name="Amy Wong", email="amy@example.com",
             role_id="role_po", color="#db2777", emoji="\U0001f984", is_active=True),
        User(id="user_raj", name="Raj Patel", email="raj@example.com",
             role_id="role_cs", color="#ea580c", emoji="\U0001f422", is_active=False),
    ]

    statuses = [
        Status(id="status_todo", name="To Do", position=0, is_locked=True),
        Status(id="status_progress", name="In Progress", position=1, is_locked=True),
        Status(id="status_review", name="Review", position=2, is_locked=False),
        Status(id="status_done", name="Done", position=3, is_locked=True),
    ]

    labels = [
        Label(id="label_bug", name="Bug", color="#dc2626"),
        Label(id="label_feature", name="Feature", color="#16a34a"),
        Label(id="label_chore", name="Chore", color="#64748b"),
        Label(id="label_blocked", name="Blocked", color="#b91c1c"),
    ]

    effort_levels = [
        EffortLevel(id="effort_low", name="Low", position=0),
        EffortLevel(id="effort_medium", name="Medium", position=1),
        EffortLevel(id="effort_high", name="High", position=2),
        EffortLevel(id="effort_highest", name="Highest", position=3),
    ]

    boards = [
        Board(id="board_eng", name="Engineering", is_archived=False,
              theme=dict(DEFAULT_BOARD_THEME)),
        Board(id="board_mkt", name="Marketing Launch", is_archived=False,
              theme=dict(_SUNSET_THEME)),
        Board(id="board_old", name="2023 Cleanup", is_archived=True,
              theme=dict(_SLATE_THEME)),
    ]

    t = now()

    def card(**overrides) -> Card:
        base = {
            "id": new_id(),
            "board_id": "board_eng",
            "status_id": "status_todo",
            "title": "",
            "description": "",
            "assignee_id": None,
            "creator_id": "user_jane",
            "effort_level_id": None,
            "label_ids": [],
            "position": 0,
            "is_archived": False,
            "created_at": t,
            "updated_at": t,
        }
        base.update(overrides)
        return Card(**base)

    cards = [
        card(title="Set up CI pipeline", status_id="status_progress", position=0,
             description="GitHub Actions running lint + pytest on every PR.",
             assignee_id="user_jane", effort_level_id="effort_medium",
             label_ids=["label_chore"]),
        card(title="Login page returns 500 on empty email", status_id="status_todo",
             position=0, assignee_id="user_john", effort_level_id="effort_high",
             label_ids=["label_bug"]),
        card(title="Drag-and-drop card reordering", status_id="status_todo",
             position=1, effort_level_id="effort_highest", label_ids=["label_feature"]),
        card(title="Write onboarding docs", status_id="status_review", position=0,
             assignee_id="user_amy", effort_level_id="effort_low"),
        card(title="Pick a color palette", status_id="status_done", position=0,
             assignee_id="user_jane", label_ids=["label_chore"]),
        card(board_id="board_mkt", title="Draft launch email", status_id="status_todo",
             position=0, assignee_id="user_amy", effort_level_id="effort_medium"),
        card(board_id="board_mkt", title="Book venue", status_id="status_progress",
             position=0, effort_level_id="effort_high", label_ids=["label_blocked"]),
        card(board_id="board_old", title="Archived board card (read-only)",
             status_id="status_done", position=0, is_archived=True),
    ]

    return [*roles, *users, *statuses, *labels, *effort_levels, *boards, *cards]
