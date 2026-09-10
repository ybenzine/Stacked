# Stacked — Frontend

React + TypeScript + Vite implementation of the UI described in
[`../_docs/specs.md`](../_docs/specs.md). **No real backend yet** — every server
call goes through a single mocked module.

## Run

```sh
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
```

Data is seeded into `localStorage` on first load. Admin → *Danger zone → Reset
demo data* wipes and reseeds it.

## Where the backend lives

All backend access is centralised in **`src/api/client.ts`**. It exports one
object, `api`, whose methods are `async` and return the types in
`src/api/types.ts`. Today those methods are served by an in-memory
`MockBackend` (persisted to `localStorage`, seeded from `src/api/seed.ts`) that
also generates the activity-log entries.

To connect a real backend, replace each method body in `client.ts` with a
`fetch(...)` call. Nothing else in the app imports mock data or knows the
backend is fake.

## Structure

| Path | Purpose |
|---|---|
| `src/api/client.ts` | **The only place** that talks to the backend (mocked). |
| `src/api/types.ts` | Domain types = the backend contract. |
| `src/api/seed.ts` | Demo data. |
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
