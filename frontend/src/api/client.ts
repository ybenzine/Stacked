/**
 * Centralised backend client.
 *
 * Every network call the app makes goes through the `api` object exported here.
 * Today it is backed by an in-memory mock (see `MockBackend` below) that persists
 * to localStorage. To switch to a real backend, replace the method bodies with
 * `fetch(...)` calls — the signatures and return types are the contract.
 */

import { buildSeed, DEFAULT_BOARD_THEME, now, uid, type DB } from "./seed";
import type {
  ActivityLogEntry,
  Board,
  BoardTheme,
  Bootstrap,
  Card,
  CardPatch,
  EffortLevel,
  ID,
  Label,
  NewUserInput,
  Role,
  Status,
  User,
} from "./types";

const STORAGE_KEY = "stacked.db.v1";
const LATENCY_MS = 120;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

class MockBackend {
  private db: DB;
  /** The user whose name is attached to activity-log entries. */
  private actorId: ID | null = null;

  constructor() {
    this.db = this.load();
  }

  // ---- persistence -------------------------------------------------------

  private load(): DB {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return this.migrate(JSON.parse(raw) as DB);
    } catch {
      /* ignore corrupt storage */
    }
    const seed = buildSeed();
    this.persist(seed);
    return seed;
  }

  /** Backfill fields added after data was first persisted to this browser. */
  private migrate(db: DB): DB {
    for (const b of db.boards) {
      if (!b.theme) b.theme = { ...DEFAULT_BOARD_THEME };
    }
    return db;
  }

  private persist(db: DB = this.db) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* storage full / unavailable — mock still works in memory */
    }
  }

  private save() {
    this.persist();
  }

  /** Wipe local data and reseed. Handy for demos. */
  async resetAll(): Promise<void> {
    this.db = buildSeed();
    this.persist();
    return delay(undefined);
  }

  // ---- actor -----------------------------------------------------------

  setActor(userId: ID | null) {
    this.actorId = userId;
  }

  private logEntry(cardId: ID, description: string): ActivityLogEntry {
    return {
      id: uid(),
      card_id: cardId,
      user_id: this.actorId,
      description,
      created_at: now(),
    };
  }

  // ---- bootstrap ------------------------------------------------------

  async getBootstrap(): Promise<Bootstrap> {
    const { users, roles, boards, statuses, labels, effortLevels } = this.db;
    return delay(
      clone({
        users,
        roles,
        boards,
        statuses: [...statuses].sort((a, b) => a.position - b.position),
        labels,
        effortLevels: [...effortLevels].sort((a, b) => a.position - b.position),
      }),
    );
  }

  // ---- users --------------------------------------------------------

  async findUserByEmail(email: string): Promise<User | null> {
    const u =
      this.db.users.find(
        (x) => x.email.trim().toLowerCase() === email.trim().toLowerCase(),
      ) ?? null;
    return delay(u ? clone(u) : null);
  }

  async createUser(input: NewUserInput): Promise<User> {
    const existing = await this.rawFindUserByEmail(input.email);
    if (existing) {
      // Reattach rather than duplicate (spec: matched by email if it exists).
      Object.assign(existing, {
        name: input.name,
        role_id: input.role_id,
        color: input.color,
        emoji: input.emoji,
        is_active: true,
      });
      this.save();
      return delay(clone(existing));
    }
    const user: User = {
      id: uid(),
      name: input.name,
      email: input.email,
      role_id: input.role_id,
      color: input.color,
      emoji: input.emoji,
      is_active: true,
    };
    this.db.users.push(user);
    this.save();
    return delay(clone(user));
  }

  private rawFindUserByEmail(email: string): User | undefined {
    return this.db.users.find(
      (x) => x.email.trim().toLowerCase() === email.trim().toLowerCase(),
    );
  }

  async setUserActive(userId: ID, isActive: boolean): Promise<User> {
    const u = this.mustUser(userId);
    u.is_active = isActive;
    this.save();
    return delay(clone(u));
  }

  private mustUser(id: ID): User {
    const u = this.db.users.find((x) => x.id === id);
    if (!u) throw new Error(`No user ${id}`);
    return u;
  }

  // ---- roles -------------------------------------------------------

  async createRole(name: string): Promise<Role> {
    const role: Role = { id: uid(), name: name.trim() };
    this.db.roles.push(role);
    this.save();
    return delay(clone(role));
  }

  async updateRole(id: ID, name: string): Promise<Role> {
    const r = this.db.roles.find((x) => x.id === id);
    if (!r) throw new Error("no role");
    r.name = name.trim();
    this.save();
    return delay(clone(r));
  }

  async deleteRole(id: ID): Promise<void> {
    this.db.roles = this.db.roles.filter((x) => x.id !== id);
    for (const u of this.db.users) if (u.role_id === id) u.role_id = null;
    this.save();
    return delay(undefined);
  }

  // ---- labels -----------------------------------------------------

  async createLabel(name: string, color: string): Promise<Label> {
    const label: Label = { id: uid(), name: name.trim(), color };
    this.db.labels.push(label);
    this.save();
    return delay(clone(label));
  }

  async updateLabel(id: ID, patch: Partial<Pick<Label, "name" | "color">>): Promise<Label> {
    const l = this.db.labels.find((x) => x.id === id);
    if (!l) throw new Error("no label");
    if (patch.name !== undefined) l.name = patch.name.trim();
    if (patch.color !== undefined) l.color = patch.color;
    this.save();
    return delay(clone(l));
  }

  async deleteLabel(id: ID): Promise<void> {
    this.db.labels = this.db.labels.filter((x) => x.id !== id);
    for (const c of this.db.cards) {
      c.label_ids = c.label_ids.filter((lid) => lid !== id);
    }
    this.save();
    return delay(undefined);
  }

  // ---- effort levels --------------------------------------------

  async createEffortLevel(name: string): Promise<EffortLevel> {
    const position = this.db.effortLevels.length;
    const e: EffortLevel = { id: uid(), name: name.trim(), position };
    this.db.effortLevels.push(e);
    this.save();
    return delay(clone(e));
  }

  async updateEffortLevel(id: ID, name: string): Promise<EffortLevel> {
    const e = this.db.effortLevels.find((x) => x.id === id);
    if (!e) throw new Error("no effort level");
    e.name = name.trim();
    this.save();
    return delay(clone(e));
  }

  async deleteEffortLevel(id: ID): Promise<void> {
    this.db.effortLevels = this.db.effortLevels.filter((x) => x.id !== id);
    for (const c of this.db.cards) {
      if (c.effort_level_id === id) c.effort_level_id = null;
    }
    this.save();
    return delay(undefined);
  }

  async reorderEffortLevels(orderedIds: ID[]): Promise<EffortLevel[]> {
    orderedIds.forEach((id, i) => {
      const e = this.db.effortLevels.find((x) => x.id === id);
      if (e) e.position = i;
    });
    this.save();
    return delay(clone([...this.db.effortLevels].sort((a, b) => a.position - b.position)));
  }

  // ---- statuses -------------------------------------------------

  async createStatus(name: string): Promise<Status> {
    const position = this.db.statuses.length;
    const s: Status = { id: uid(), name: name.trim(), position, is_locked: false };
    this.db.statuses.push(s);
    this.save();
    return delay(clone(s));
  }

  async updateStatus(id: ID, name: string): Promise<Status> {
    const s = this.db.statuses.find((x) => x.id === id);
    if (!s) throw new Error("no status");
    if (s.is_locked) throw new Error("base statuses cannot be edited");
    s.name = name.trim();
    this.save();
    return delay(clone(s));
  }

  async deleteStatus(id: ID): Promise<void> {
    const s = this.db.statuses.find((x) => x.id === id);
    if (!s) throw new Error("no status");
    if (s.is_locked) throw new Error("base statuses cannot be deleted");
    const todo = this.db.statuses.find((x) => x.name === "To Do");
    if (!todo) throw new Error("missing To Do status");
    for (const c of this.db.cards) {
      if (c.status_id === id) {
        c.status_id = todo.id;
        c.updated_at = now();
        c.activity.push(
          this.logEntry(c.id, `status "${s.name}" was deleted — moved to To Do`),
        );
      }
    }
    this.db.statuses = this.db.statuses.filter((x) => x.id !== id);
    this.db.statuses.forEach((x, i) => (x.position = i));
    this.save();
    return delay(undefined);
  }

  async reorderStatuses(orderedIds: ID[]): Promise<Status[]> {
    orderedIds.forEach((id, i) => {
      const s = this.db.statuses.find((x) => x.id === id);
      if (s) s.position = i;
    });
    this.save();
    return delay(clone([...this.db.statuses].sort((a, b) => a.position - b.position)));
  }

  // ---- boards --------------------------------------------------

  async createBoard(name: string): Promise<Board> {
    const b: Board = {
      id: uid(),
      name: name.trim(),
      is_archived: false,
      theme: { ...DEFAULT_BOARD_THEME },
    };
    this.db.boards.push(b);
    this.save();
    return delay(clone(b));
  }

  async setBoardTheme(id: ID, theme: BoardTheme): Promise<Board> {
    const b = this.db.boards.find((x) => x.id === id);
    if (!b) throw new Error("no board");
    b.theme = { base_color: theme.base_color, secondary_color: theme.secondary_color };
    this.save();
    return delay(clone(b));
  }

  async renameBoard(id: ID, name: string): Promise<Board> {
    const b = this.db.boards.find((x) => x.id === id);
    if (!b) throw new Error("no board");
    b.name = name.trim();
    this.save();
    return delay(clone(b));
  }

  async archiveBoard(id: ID, typedName: string): Promise<Board> {
    const b = this.db.boards.find((x) => x.id === id);
    if (!b) throw new Error("no board");
    if (typedName.trim() !== b.name)
      throw new Error("Confirmation text does not match the board name");
    b.is_archived = true;
    for (const c of this.db.cards) if (c.board_id === id) c.is_archived = true;
    this.save();
    return delay(clone(b));
  }

  async unarchiveBoard(id: ID): Promise<Board> {
    const b = this.db.boards.find((x) => x.id === id);
    if (!b) throw new Error("no board");
    b.is_archived = false;
    for (const c of this.db.cards) if (c.board_id === id) c.is_archived = false;
    this.save();
    return delay(clone(b));
  }

  // ---- cards --------------------------------------------------

  async listCards(boardId: ID): Promise<Card[]> {
    const cards = this.db.cards
      .filter((c) => c.board_id === boardId)
      .sort((a, b) => a.position - b.position);
    return delay(clone(cards));
  }

  async createCard(input: {
    board_id: ID;
    status_id: ID;
    title: string;
    description?: string;
    assignee_id?: ID | null;
    effort_level_id?: ID | null;
    label_ids?: ID[];
  }): Promise<Card> {
    const board = this.db.boards.find((b) => b.id === input.board_id);
    if (board?.is_archived) throw new Error("board is archived (read-only)");
    const siblings = this.db.cards.filter(
      (c) => c.board_id === input.board_id && c.status_id === input.status_id,
    );
    const position = siblings.length
      ? Math.max(...siblings.map((c) => c.position)) + 1
      : 0;
    const t = now();
    const card: Card = {
      id: uid(),
      board_id: input.board_id,
      status_id: input.status_id,
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
      assignee_id: input.assignee_id ?? null,
      creator_id: this.actorId,
      effort_level_id: input.effort_level_id ?? null,
      label_ids: input.label_ids ?? [],
      position,
      is_archived: false,
      created_at: t,
      updated_at: t,
      activity: [],
    };
    card.activity.push(this.logEntry(card.id, "created this card"));
    if (card.assignee_id) {
      card.activity.push(
        this.logEntry(card.id, `assignee set to ${this.userName(card.assignee_id)}`),
      );
    }
    this.db.cards.push(card);
    this.save();
    return delay(clone(card));
  }

  async updateCard(id: ID, patch: CardPatch): Promise<Card> {
    const c = this.mustCard(id);
    this.assertWritable(c);

    if (patch.title !== undefined && patch.title.trim() !== c.title) {
      c.activity.push(this.logEntry(c.id, `title changed to "${patch.title.trim()}"`));
      c.title = patch.title.trim();
    }
    if (patch.description !== undefined && patch.description !== c.description) {
      c.activity.push(this.logEntry(c.id, "description updated"));
      c.description = patch.description;
    }
    if (patch.assignee_id !== undefined && patch.assignee_id !== c.assignee_id) {
      c.activity.push(
        this.logEntry(
          c.id,
          `assignee changed from ${this.userName(c.assignee_id)} to ${this.userName(
            patch.assignee_id,
          )}`,
        ),
      );
      c.assignee_id = patch.assignee_id;
    }
    if (
      patch.effort_level_id !== undefined &&
      patch.effort_level_id !== c.effort_level_id
    ) {
      c.activity.push(
        this.logEntry(
          c.id,
          `effort changed from ${this.effortName(c.effort_level_id)} to ${this.effortName(
            patch.effort_level_id,
          )}`,
        ),
      );
      c.effort_level_id = patch.effort_level_id;
    }
    if (patch.label_ids !== undefined) {
      const before = new Set(c.label_ids);
      const after = new Set(patch.label_ids);
      for (const lid of after)
        if (!before.has(lid))
          c.activity.push(this.logEntry(c.id, `label "${this.labelName(lid)}" added`));
      for (const lid of before)
        if (!after.has(lid))
          c.activity.push(this.logEntry(c.id, `label "${this.labelName(lid)}" removed`));
      c.label_ids = [...patch.label_ids];
    }
    c.updated_at = now();
    this.save();
    return delay(clone(c));
  }

  /** Move a card to a status at a given index; renormalises positions. */
  async moveCard(id: ID, toStatusId: ID, toIndex: number): Promise<Card[]> {
    const c = this.mustCard(id);
    this.assertWritable(c);
    const fromStatusId = c.status_id;

    if (fromStatusId !== toStatusId) {
      c.activity.push(
        this.logEntry(
          c.id,
          `moved from ${this.statusName(fromStatusId)} to ${this.statusName(toStatusId)}`,
        ),
      );
    } else {
      c.activity.push(this.logEntry(c.id, "reordered within " + this.statusName(toStatusId)));
    }
    c.status_id = toStatusId;
    c.updated_at = now();

    const column = this.db.cards
      .filter((x) => x.board_id === c.board_id && x.status_id === toStatusId && x.id !== id)
      .sort((a, b) => a.position - b.position);
    const clamped = Math.max(0, Math.min(toIndex, column.length));
    column.splice(clamped, 0, c);
    column.forEach((x, i) => (x.position = i));

    // renormalise the source column too
    this.db.cards
      .filter((x) => x.board_id === c.board_id && x.status_id === fromStatusId)
      .sort((a, b) => a.position - b.position)
      .forEach((x, i) => (x.position = i));

    this.save();
    return this.listCards(c.board_id);
  }

  async deleteCard(id: ID): Promise<void> {
    const c = this.mustCard(id);
    this.assertWritable(c);
    this.db.cards = this.db.cards.filter((x) => x.id !== id);
    this.save();
    return delay(undefined);
  }

  // ---- helpers ------------------------------------------------

  private mustCard(id: ID): Card {
    const c = this.db.cards.find((x) => x.id === id);
    if (!c) throw new Error(`No card ${id}`);
    return c;
  }

  private assertWritable(c: Card) {
    const board = this.db.boards.find((b) => b.id === c.board_id);
    if (board?.is_archived || c.is_archived) {
      throw new Error("This card belongs to an archived board and is read-only");
    }
  }

  private userName(id: ID | null): string {
    if (!id) return "—";
    return this.db.users.find((u) => u.id === id)?.name ?? "—";
  }
  private effortName(id: ID | null): string {
    if (!id) return "—";
    return this.db.effortLevels.find((e) => e.id === id)?.name ?? "—";
  }
  private labelName(id: ID): string {
    return this.db.labels.find((l) => l.id === id)?.name ?? "?";
  }
  private statusName(id: ID): string {
    return this.db.statuses.find((s) => s.id === id)?.name ?? "?";
  }
}

const backend = new MockBackend();

export const api = {
  setActor: (userId: ID | null) => backend.setActor(userId),
  resetAll: () => backend.resetAll(),

  getBootstrap: () => backend.getBootstrap(),

  findUserByEmail: (email: string) => backend.findUserByEmail(email),
  createUser: (input: NewUserInput) => backend.createUser(input),
  setUserActive: (userId: ID, isActive: boolean) => backend.setUserActive(userId, isActive),

  createRole: (name: string) => backend.createRole(name),
  updateRole: (id: ID, name: string) => backend.updateRole(id, name),
  deleteRole: (id: ID) => backend.deleteRole(id),

  createLabel: (name: string, color: string) => backend.createLabel(name, color),
  updateLabel: (id: ID, patch: Partial<Pick<Label, "name" | "color">>) =>
    backend.updateLabel(id, patch),
  deleteLabel: (id: ID) => backend.deleteLabel(id),

  createEffortLevel: (name: string) => backend.createEffortLevel(name),
  updateEffortLevel: (id: ID, name: string) => backend.updateEffortLevel(id, name),
  deleteEffortLevel: (id: ID) => backend.deleteEffortLevel(id),
  reorderEffortLevels: (orderedIds: ID[]) => backend.reorderEffortLevels(orderedIds),

  createStatus: (name: string) => backend.createStatus(name),
  updateStatus: (id: ID, name: string) => backend.updateStatus(id, name),
  deleteStatus: (id: ID) => backend.deleteStatus(id),
  reorderStatuses: (orderedIds: ID[]) => backend.reorderStatuses(orderedIds),

  createBoard: (name: string) => backend.createBoard(name),
  renameBoard: (id: ID, name: string) => backend.renameBoard(id, name),
  setBoardTheme: (id: ID, theme: BoardTheme) => backend.setBoardTheme(id, theme),
  archiveBoard: (id: ID, typedName: string) => backend.archiveBoard(id, typedName),
  unarchiveBoard: (id: ID) => backend.unarchiveBoard(id),

  listCards: (boardId: ID) => backend.listCards(boardId),
  createCard: (input: Parameters<MockBackend["createCard"]>[0]) => backend.createCard(input),
  updateCard: (id: ID, patch: CardPatch) => backend.updateCard(id, patch),
  moveCard: (id: ID, toStatusId: ID, toIndex: number) =>
    backend.moveCard(id, toStatusId, toIndex),
  deleteCard: (id: ID) => backend.deleteCard(id),
};

export type Api = typeof api;
