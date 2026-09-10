# Stacked — Frontend

React + TypeScript + Vite implementation of the UI described in
[`../_docs/specs.md`](../_docs/specs.md). It talks to the FastAPI backend in
[`../app`](../app) over `fetch`; the contract is [`../openapi.yaml`](../openapi.yaml).

## Run

```sh
cd frontend
npm install
npm run dev        # http://localhost:5173

# in another terminal, from the repo root:
make backend       # FastAPI on http://127.0.0.1:8000
```

Or run both together with `make dev` from the repo root.

The dev server proxies `/api/*` to the backend (see `vite.config.ts`). Admin →
*Danger zone → Reset demo data* calls `POST /api/reset`, which wipes and reseeds
the backend's in-memory store (requires `STACKED_EXPOSE_DEV_RESET=true`).

## Configuration

Copy `.env.example` to `.env` to override:

| Var | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | Base URL for backend calls. Set to an absolute URL when the frontend is served separately from the backend. |
| `VITE_API_PROXY` | `http://127.0.0.1:8000` | Where `npm run dev` forwards `/api` requests. |

## Where the backend lives

All backend access is centralised in **`src/api/client.ts`**. It exports one
object, `api`, whose methods are `async`, issue `fetch` calls to
`VITE_API_BASE_URL`, and return the types in `src/api/types.ts`. The acting user
is sent as the `X-Actor-Id` header (set via `api.setActor`); failed responses
are thrown as `ApiError` carrying the HTTP status and the backend's `message`.
Nothing else in the app knows a network is involved.

`src/api/seed.ts` is now only demo/reference data for the admin theme picker;
the backend owns the real seed.

## Structure

| Path | Purpose |
|---|---|
| `src/api/client.ts` | **The only place** that talks to the backend (`fetch`). |
| `src/api/types.ts` | Domain types = the backend contract. |
| `src/api/seed.ts` | Theme presets + reference demo data. |
| `src/state/store.tsx` | React context: loads reference data + cards, current user/board, exposes `api`. |
| `src/components/BoardView.tsx` | Columns, cards, drag-and-drop + "move to" fallback, filter/search bar. |
| `src/components/CardDialog.tsx` | Full card editor, status move, delete-with-confirm, activity log. |
| `src/components/AdminPage.tsx` | CRUD for roles, labels, boards (archive with typed-name confirm), statuses (base locked, reorderable), effort levels, user active/inactive. |
| `src/components/IdentityDialog.tsx` | First-run identify + "switch identity" (email match reattaches). |
| `src/components/Header.tsx` | Board picker, create board, identity menu, Board/Admin nav. |

## Spec coverage

Sign-up/identify with local persistence and email match · switch identity ·
board select/create · board view with assignee/effort/label on cards ·
quick-add and full card editor · drag-and-drop move/reorder with dropdown
fallback, each move logged · assign from active users · delete with
confirmation · filter by assignee/label/effort + title search · admin CRUD for
all reference data · base statuses locked · cascading deletes · board
archive/unarchive with typed-name confirmation and read-only archived cards.
