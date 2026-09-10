"""In-memory mock database.

A single process-wide :class:`Store` holds plain dicts that match the wire
schema. It stands in for a real database until one is wired up; swap the guts
of this module and the routers stay unchanged.
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4


def new_id() -> str:
    return "id_" + uuid4().hex[:12]


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ------------------------------------------------------------------------- seed
DEFAULT_BOARD_THEME = {"base_color": "#2f7fe4", "secondary_color": "#f7c948"}
_SUNSET_THEME = {"base_color": "#ea580c", "secondary_color": "#db2777"}
_SLATE_THEME = {"base_color": "#475569", "secondary_color": "#0ea5e9"}


def build_seed() -> dict[str, list[dict]]:
    """Mirror ``frontend/src/api/seed.ts`` so the API matches the mock the
    frontend was built against."""
    roles = [
        {"id": "role_se", "name": "Software Engineer"},
        {"id": "role_qa", "name": "QA Engineer"},
        {"id": "role_po", "name": "Product Owner"},
        {"id": "role_cs", "name": "Customer Success"},
    ]

    users = [
        {"id": "user_jane", "name": "Jane Doe", "email": "jane@example.com",
         "role_id": "role_se", "color": "#4f46e5", "emoji": "\U0001f98a", "is_active": True},
        {"id": "user_john", "name": "John Smith", "email": "john@example.com",
         "role_id": "role_qa", "color": "#0891b2", "emoji": "\U0001f419", "is_active": True},
        {"id": "user_amy", "name": "Amy Wong", "email": "amy@example.com",
         "role_id": "role_po", "color": "#db2777", "emoji": "\U0001f984", "is_active": True},
        {"id": "user_raj", "name": "Raj Patel", "email": "raj@example.com",
         "role_id": "role_cs", "color": "#ea580c", "emoji": "\U0001f422", "is_active": False},
    ]

    statuses = [
        {"id": "status_todo", "name": "To Do", "position": 0, "is_locked": True},
        {"id": "status_progress", "name": "In Progress", "position": 1, "is_locked": True},
        {"id": "status_review", "name": "Review", "position": 2, "is_locked": False},
        {"id": "status_done", "name": "Done", "position": 3, "is_locked": True},
    ]

    labels = [
        {"id": "label_bug", "name": "Bug", "color": "#dc2626"},
        {"id": "label_feature", "name": "Feature", "color": "#16a34a"},
        {"id": "label_chore", "name": "Chore", "color": "#64748b"},
        {"id": "label_blocked", "name": "Blocked", "color": "#b91c1c"},
    ]

    effort_levels = [
        {"id": "effort_low", "name": "Low", "position": 0},
        {"id": "effort_medium", "name": "Medium", "position": 1},
        {"id": "effort_high", "name": "High", "position": 2},
        {"id": "effort_highest", "name": "Highest", "position": 3},
    ]

    boards = [
        {"id": "board_eng", "name": "Engineering", "is_archived": False,
         "theme": dict(DEFAULT_BOARD_THEME)},
        {"id": "board_mkt", "name": "Marketing Launch", "is_archived": False,
         "theme": dict(_SUNSET_THEME)},
        {"id": "board_old", "name": "2023 Cleanup", "is_archived": True,
         "theme": dict(_SLATE_THEME)},
    ]

    t = now()

    def card(**overrides) -> dict:
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
            "activity": [],
        }
        base.update(overrides)
        return base

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

    return {
        "users": users,
        "roles": roles,
        "boards": boards,
        "statuses": statuses,
        "labels": labels,
        "effort_levels": effort_levels,
        "cards": cards,
    }


# ------------------------------------------------------------------------ store
class Store:
    users: list[dict]
    roles: list[dict]
    boards: list[dict]
    statuses: list[dict]
    labels: list[dict]
    effort_levels: list[dict]
    cards: list[dict]

    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        seed = build_seed()
        self.users = seed["users"]
        self.roles = seed["roles"]
        self.boards = seed["boards"]
        self.statuses = seed["statuses"]
        self.labels = seed["labels"]
        self.effort_levels = seed["effort_levels"]
        self.cards = seed["cards"]

    # -- lookups ----------------------------------------------------------
    @staticmethod
    def _by_id(items: list[dict], id_: str) -> dict | None:
        return next((x for x in items if x["id"] == id_), None)

    def get_user(self, id_: str) -> dict | None:
        return self._by_id(self.users, id_)

    def get_role(self, id_: str) -> dict | None:
        return self._by_id(self.roles, id_)

    def get_label(self, id_: str) -> dict | None:
        return self._by_id(self.labels, id_)

    def get_effort_level(self, id_: str) -> dict | None:
        return self._by_id(self.effort_levels, id_)

    def get_status(self, id_: str) -> dict | None:
        return self._by_id(self.statuses, id_)

    def get_board(self, id_: str) -> dict | None:
        return self._by_id(self.boards, id_)

    def get_card(self, id_: str) -> dict | None:
        return self._by_id(self.cards, id_)

    def find_user_by_email(self, email: str) -> dict | None:
        needle = email.strip().lower()
        return next(
            (u for u in self.users if u["email"].strip().lower() == needle), None
        )

    # -- name helpers for activity-log copy ------------------------------
    def user_name(self, id_: str | None) -> str:
        if not id_:
            return "—"
        u = self.get_user(id_)
        return u["name"] if u else "—"

    def effort_name(self, id_: str | None) -> str:
        if not id_:
            return "—"
        e = self.get_effort_level(id_)
        return e["name"] if e else "—"

    def label_name(self, id_: str) -> str:
        lbl = self.get_label(id_)
        return lbl["name"] if lbl else "?"

    def status_name(self, id_: str) -> str:
        s = self.get_status(id_)
        return s["name"] if s else "?"

    def activity_entry(self, card_id: str, user_id: str | None, description: str) -> dict:
        return {
            "id": new_id(),
            "card_id": card_id,
            "user_id": user_id,
            "description": description,
            "created_at": now(),
        }


store = Store()
