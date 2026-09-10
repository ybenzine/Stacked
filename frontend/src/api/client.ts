/**
 * Centralised backend client.
 *
 * Every network call the app makes goes through the `api` object exported here.
 * It talks to the FastAPI backend described in `../../../openapi.yaml` over
 * `fetch`. The method signatures and return types are the contract the rest of
 * the app relies on — nothing else knows a network is involved.
 *
 * Base URL comes from `VITE_API_BASE_URL` (see `frontend/.env.example`) and
 * defaults to `/api`, which the Vite dev server proxies to the backend
 * (see `vite.config.ts`).
 */

import type {
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

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");

/** The acting user, sent as `X-Actor-Id` on every request. Attribution only. */
let actorId: ID | null = null;

/** Error carrying the HTTP status, so callers can branch on it (e.g. 404). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string>;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query } = opts;

  let url = `${API_BASE}${path}`;
  if (query) url += `?${new URLSearchParams(query).toString()}`;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (actorId) headers["X-Actor-Id"] = actorId;

  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const err = await res.json();
      if (err && typeof err.message === "string") message = err.message;
    } catch {
      /* non-JSON error body — keep the status text */
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  setActor: (userId: ID | null) => {
    actorId = userId;
  },
  resetAll: () => request<void>("/reset", { method: "POST" }),

  getBootstrap: () => request<Bootstrap>("/bootstrap"),

  findUserByEmail: async (email: string): Promise<User | null> => {
    try {
      return await request<User>("/users/by-email", { query: { email } });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
  createUser: (input: NewUserInput) =>
    request<User>("/users", { method: "POST", body: input }),
  setUserActive: (userId: ID, isActive: boolean) =>
    request<User>(`/users/${userId}`, {
      method: "PATCH",
      body: { is_active: isActive },
    }),

  createRole: (name: string) =>
    request<Role>("/roles", { method: "POST", body: { name } }),
  updateRole: (id: ID, name: string) =>
    request<Role>(`/roles/${id}`, { method: "PATCH", body: { name } }),
  deleteRole: (id: ID) => request<void>(`/roles/${id}`, { method: "DELETE" }),

  createLabel: (name: string, color: string) =>
    request<Label>("/labels", { method: "POST", body: { name, color } }),
  updateLabel: (id: ID, patch: Partial<Pick<Label, "name" | "color">>) =>
    request<Label>(`/labels/${id}`, { method: "PATCH", body: patch }),
  deleteLabel: (id: ID) => request<void>(`/labels/${id}`, { method: "DELETE" }),

  createEffortLevel: (name: string) =>
    request<EffortLevel>("/effort-levels", { method: "POST", body: { name } }),
  updateEffortLevel: (id: ID, name: string) =>
    request<EffortLevel>(`/effort-levels/${id}`, { method: "PATCH", body: { name } }),
  deleteEffortLevel: (id: ID) =>
    request<void>(`/effort-levels/${id}`, { method: "DELETE" }),
  reorderEffortLevels: (orderedIds: ID[]) =>
    request<EffortLevel[]>("/effort-levels/reorder", {
      method: "POST",
      body: { ordered_ids: orderedIds },
    }),

  createStatus: (name: string) =>
    request<Status>("/statuses", { method: "POST", body: { name } }),
  updateStatus: (id: ID, name: string) =>
    request<Status>(`/statuses/${id}`, { method: "PATCH", body: { name } }),
  deleteStatus: (id: ID) => request<void>(`/statuses/${id}`, { method: "DELETE" }),
  reorderStatuses: (orderedIds: ID[]) =>
    request<Status[]>("/statuses/reorder", {
      method: "POST",
      body: { ordered_ids: orderedIds },
    }),

  createBoard: (name: string) =>
    request<Board>("/boards", { method: "POST", body: { name } }),
  renameBoard: (id: ID, name: string) =>
    request<Board>(`/boards/${id}`, { method: "PATCH", body: { name } }),
  setBoardTheme: (id: ID, theme: BoardTheme) =>
    request<Board>(`/boards/${id}`, { method: "PATCH", body: { theme } }),
  archiveBoard: (id: ID, typedName: string) =>
    request<Board>(`/boards/${id}/archive`, {
      method: "POST",
      body: { confirm_name: typedName },
    }),
  unarchiveBoard: (id: ID) =>
    request<Board>(`/boards/${id}/unarchive`, { method: "POST" }),

  listCards: (boardId: ID) => request<Card[]>(`/boards/${boardId}/cards`),
  createCard: (input: {
    board_id: ID;
    status_id: ID;
    title: string;
    description?: string;
    assignee_id?: ID | null;
    effort_level_id?: ID | null;
    label_ids?: ID[];
  }) => {
    const { board_id, ...body } = input;
    return request<Card>(`/boards/${board_id}/cards`, { method: "POST", body });
  },
  updateCard: (id: ID, patch: CardPatch) =>
    request<Card>(`/cards/${id}`, { method: "PATCH", body: patch }),
  moveCard: (id: ID, toStatusId: ID, toIndex: number) =>
    request<Card[]>(`/cards/${id}/move`, {
      method: "POST",
      body: { to_status_id: toStatusId, to_index: toIndex },
    }),
  deleteCard: (id: ID) => request<void>(`/cards/${id}`, { method: "DELETE" }),
};

export type Api = typeof api;
