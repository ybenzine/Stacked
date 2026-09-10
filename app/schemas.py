"""Request and response models — the wire contract from ``openapi.yaml``."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator

HEX = r"^#[0-9a-fA-F]{6}$"


# --------------------------------------------------------------------- entities
class Entity(BaseModel):
    """Base for wire entities — reads straight off ORM model instances."""

    model_config = ConfigDict(from_attributes=True)


class Role(Entity):
    id: str
    name: str


class User(Entity):
    id: str
    name: str
    email: str
    role_id: str | None
    color: str
    emoji: str
    is_active: bool


class BoardTheme(Entity):
    base_color: str = Field(pattern=HEX)
    secondary_color: str = Field(pattern=HEX)


class Board(Entity):
    id: str
    name: str
    is_archived: bool
    theme: BoardTheme


class Status(Entity):
    id: str
    name: str
    position: int
    is_locked: bool


class Label(Entity):
    id: str
    name: str
    color: str


class EffortLevel(Entity):
    id: str
    name: str
    position: int


class ActivityLogEntry(Entity):
    id: str
    card_id: str
    user_id: str | None
    description: str
    created_at: str


class Card(Entity):
    id: str
    board_id: str
    status_id: str
    title: str
    description: str
    assignee_id: str | None
    creator_id: str | None
    effort_level_id: str | None
    label_ids: list[str]
    position: int
    is_archived: bool
    created_at: str
    updated_at: str
    activity: list[ActivityLogEntry]


class Bootstrap(Entity):
    users: list[User]
    roles: list[Role]
    boards: list[Board]
    statuses: list[Status]
    labels: list[Label]
    effortLevels: list[EffortLevel]  # noqa: N815 — matches the frontend contract


class Error(BaseModel):
    message: str


# --------------------------------------------------------------------- requests
class NewUserInput(BaseModel):
    name: str
    email: str
    role_id: str | None = None
    color: str = Field(pattern=HEX)
    emoji: str


class SetUserActiveBody(BaseModel):
    is_active: bool


class NameBody(BaseModel):
    name: str


class ReorderBody(BaseModel):
    ordered_ids: list[str]


class CreateLabelBody(BaseModel):
    name: str
    color: str = Field(pattern=HEX)


class UpdateLabelBody(BaseModel):
    name: str | None = None
    color: str | None = Field(default=None, pattern=HEX)

    @model_validator(mode="after")
    def _at_least_one(self):
        if not self.model_fields_set:
            raise ValueError("at least one of name, color is required")
        return self


class UpdateBoardBody(BaseModel):
    name: str | None = None
    theme: BoardTheme | None = None

    @model_validator(mode="after")
    def _at_least_one(self):
        if not self.model_fields_set:
            raise ValueError("at least one of name, theme is required")
        return self


class ArchiveBoardBody(BaseModel):
    confirm_name: str


class CreateCardBody(BaseModel):
    status_id: str
    title: str
    description: str = ""
    assignee_id: str | None = None
    effort_level_id: str | None = None
    label_ids: list[str] = Field(default_factory=list)


class CardPatch(BaseModel):
    title: str | None = None
    description: str | None = None
    assignee_id: str | None = None
    effort_level_id: str | None = None
    label_ids: list[str] | None = None

    @model_validator(mode="after")
    def _at_least_one(self):
        if not self.model_fields_set:
            raise ValueError("at least one field is required")
        return self


class MoveCardBody(BaseModel):
    to_status_id: str
    to_index: int = Field(ge=0)
