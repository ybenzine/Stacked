# Stacked — Product Spec

## 1. Overview

A lightweight, internal Kanban board for tracking tasks across a small team. The tool supports multiple people creating tickets, updating status, and being assigned work across multiple boards. No complex auth — just name, email, and a few profile choices. An admin page allows configuration of the shared reference data (roles, labels, boards, statuses, effort levels) and user management.

## 2. Goals

- Let people quickly capture tasks as cards and move them across a configurable workflow (e.g. To Do → In Progress → Done).
- Make it obvious who owns what, and give each person a recognizable visual identity.
- Support multiple boards for different projects/teams.
- Keep day-to-day use frictionless — no passwords, no permission wrangling — while still giving an admin light control over shared settings.

## 3. Non-Goals (out of scope for v1)

- Real authentication (passwords, SSO, OAuth).
- Fine-grained permissions or per-board access control (any user can act on any board).
- Notifications (email/Slack).
- Time tracking or reporting/analytics dashboards.
- File attachments on cards.
- Mobile app (responsive web is enough).
- Overdue-card indicators/alerts (due dates aren't part of v1 at all, per current scope).

These can be revisited later but shouldn't block the initial build.

## 4. Users

- **Identification, not authentication.** On first use, a person enters their name and email, picks a role, a hex color, and an emoji to represent themselves, and that profile is reused to tag cards they create or are assigned to.
- **Remembered locally.** Returning users are recognized automatically on the same device/browser (no password, no re-entering email each visit). If local storage is cleared or it's a new device, they go through identification again (matched by email if it already exists).
- **Easy identity switching.** A visible "switch identity" action (e.g., in the header/profile menu) lets someone on a shared device swap to a different existing profile, or create a new one, without clearing local storage. This is expected to be rarely used but should be a simple, one-click affordance.
- **No permission tiers.** Every user can create, edit, move, assign, and delete cards on any board, and everyone has access to the Admin page (open to all users for v1 — no gating).
- **Active/inactive status.** Admins can mark existing users inactive (e.g., someone who's left the team). Inactive users are hidden from "assign to" pickers but their historical cards/activity remain intact.

## 5. Core Entities

### Board
- Multiple boards supported (e.g., "Engineering", "Marketing Launch").
- Each board has a name and its own set of cards.
- Boards cannot be deleted — only **archived** (see Section 8 for the archive flow). Archived boards are hidden from normal navigation but remain viewable/unarchivable from the Admin page.
- Statuses and effort levels are **global**, shared across all boards (not per-board).

### Column (Status)
- Represents a workflow stage, shared globally across all boards (e.g., To Do, In Progress, Done).
- Managed via the Admin page.
- **To Do, In Progress, and Done are base statuses and cannot be edited or deleted.** Additional custom statuses can be created, edited, and deleted freely.
- Deleting a custom status moves any cards currently in that status back to **To Do**.

### Card (Ticket)
- **Title** (required, short text)
- **Description** (optional, longer text)
- **Assignee** (optional, one person from the known users list)
- **Creator** (auto-set to whoever made the card)
- **Labels** (optional, multiple, from the admin-managed label list)
- **Effort level** (optional: Low / Medium / High / Highest)
- **Status/Column** (its current stage)
- **Position** (order within its column)
- **Created date / last updated date** (auto-tracked)
- **Activity log** (auto-generated history — see below)
- **Archived flag** — set automatically to true when its parent board is archived

### Label
- Name + color, managed centrally via the Admin page.
- Multiple labels can be applied to a single card.
- Deleting a label cascades — it's removed from any cards that had it, no confirmation prompt needed beyond the standard delete action.

### Effort Level
- Name (Low / Medium / High / Highest by default), managed via the Admin page.
- Optional on a card. Deleting an effort level cascades — it's cleared from any cards that had it set.

### User (lightweight)
- Name
- Email
- Role (one of: Software Engineer, QA Engineer, Product Owner, Customer Success)
- Color (hex, chosen at signup)
- Emoji (chosen at signup)
- Active / inactive flag (admin-controlled)
- Note: if a role is deleted via the Admin page, it cascades — cleared from any users who had it set.

### Activity Log Entry
- Attached to a card.
- Records what changed, by whom, and when — e.g., "moved from To Do to In Progress by Jane Doe on Sep 12", "assignee changed from — to John Smith", "label 'Bug' added".
- Read-only, auto-generated (not manually editable).

## 6. Core Features

1. **Sign up / identify**
   - First-time on a device: enter name, email, select role, pick a hex color and an emoji → profile created and remembered locally.
   - Returning on the same device: recognized automatically, straight to the board.
   - New device, existing email: re-enter email to reattach to the existing profile (rather than creating a duplicate).

2. **Select/switch boards**
   - A board picker/list to choose which board you're viewing (active, non-archived boards only).
   - Ability to create a new board.

3. **Switch identity**
   - A quick action to swap to a different existing profile, or start fresh as a new user, on the same device.

4. **View a board**
   - Columns (statuses) displayed left to right; cards top to bottom within each.
   - Each card shows: title, assignee badge (color + emoji), effort level, labels.

5. **Create a card**
   - Quick-add (title only) from any column.
   - Full editor for description, assignee, labels, effort level.

6. **Edit a card**
   - Click a card to open details and edit any field.
   - View its activity log.

7. **Move a card**
   - Drag-and-drop between columns and within a column to reorder.
   - Fallback "move to" dropdown for accessibility/non-drag use.
   - Every move is recorded in the activity log.

8. **Assign a card**
   - Pick an assignee from active users, or leave unassigned.
   - Assignee's color/emoji shown on the card for quick scanning.

9. **Delete a card**
   - With a confirmation step.

10. **Filter/search**
    - Filter cards by assignee, label, or effort level.
    - Simple text search on card title.

11. **Admin page**
    - CRUD for **Roles**
    - CRUD for **Labels** (name + color) — deleting cascades off cards
    - CRUD for **Boards**, plus **archive/unarchive** (see Section 8)
    - CRUD for **Card statuses**, with the three base statuses locked from edit/delete
    - CRUD for **Effort levels**
    - Mark existing **users** active/inactive

## 7. Key User Flows

**Flow A: New user joins and creates a task**
1. Opens the app → prompted for name, email, role, color, emoji.
2. Profile is saved locally on their device.
3. Picks a board (or lands on a default one).
4. Clicks "+ Add card" in To Do → types a title → hits enter.
5. Card appears in To Do, creator auto-set to them; activity log records creation.

**Flow B: Assigning and progressing work**
1. User opens a card, sets assignee, adds a label, sets effort to "High."
2. Each change is logged in the card's activity history.
3. Assignee drags the card from To Do → In Progress → Done over time; each move is logged.

**Flow C: Returning user**
1. Opens the app on the same device.
2. Recognized automatically via local storage — no re-entry needed.
3. Picks a board and continues working.

**Flow D: Admin configures the workspace**
1. Opens the Admin page (accessible to any user).
2. Adds a new label ("Blocked", red), adds a new board ("Q4 Planning"), marks a departed teammate inactive.
3. Changes are reflected immediately across relevant boards/pickers.

**Flow E: Archiving a board**
1. From the Admin page, selects a board and chooses "Archive."
2. Is prompted to confirm by typing the board's exact name.
3. On confirmation, the board and all of its cards are marked archived; the board disappears from the normal board picker but remains listed (as archived) in the Admin page.
4. Later, an admin can unarchive it from the Admin page, restoring it (and its cards) to normal visibility.

**Flow F: Switching identity on a shared device**
1. A different person wants to use the app on a device already tied to someone else's profile.
2. Uses the "switch identity" action, selects their existing profile (or creates a new one).
3. The board now reflects actions as that person.

## 8. Admin Page (Detail)

A dedicated settings area, separate from the board views, open to all users, containing:

| Section | Actions |
|---|---|
| Roles | Create, edit name, delete (cascades — cleared from any users who had it set) |
| Labels | Create, edit name/color, delete (cascades — removed from any cards using it) |
| Boards | Create, rename, **archive** (with typed-name confirmation) / **unarchive**. No hard delete. |
| Card statuses | Create, rename, reorder, delete for custom statuses. **To Do, In Progress, and Done are locked** — cannot be renamed or deleted. Deleting a custom status moves its cards to To Do. |
| Effort levels | Create, rename, reorder, delete (cascades — cleared from any cards using it) |
| Users | View list, toggle active/inactive |

**Archiving detail:** Archiving requires typing the board's exact name into a confirmation field before the action is enabled — a deliberate speed bump since it affects every card on the board. Archived boards and their cards are excluded from all normal views (board picker, search, assignment pickers referencing that board's cards) but remain fully visible and reversible from the Admin page's Boards section. While a board is archived, its cards are fully **read-only** — no edits, moves, assignment changes, or new activity log entries — and become editable again only once the board is unarchived.

## 9. Data Model (conceptual)

```
User
- id
- name
- email (unique)
- role_id (→ Role)
- color (hex)
- emoji
- is_active (bool)

Role
- id
- name

Board
- id
- name
- is_archived (bool)

Status (Column)
- id
- name
- position
- is_locked (bool) — true for the three base statuses (To Do, In Progress, Done)
(shared globally across all boards)

Label
- id
- name
- color (hex)

EffortLevel
- id
- name (low | medium | high | highest)
- position

Card
- id
- board_id (→ Board)
- status_id (→ Status)
- title
- description
- assignee_id (nullable → User)
- creator_id (→ User)
- effort_level_id (nullable → EffortLevel)
- position
- is_archived (bool) — set true when parent board is archived
- created_at
- updated_at

CardLabel (join table)
- card_id
- label_id

ActivityLogEntry
- id
- card_id (→ Card)
- user_id (→ User) — who made the change
- description (e.g. "moved from To Do to In Progress")
- created_at
```

## 10. Open Questions

All prior open questions have been resolved. No outstanding decisions remain — this spec is ready to move into Design.

## 11. Success Criteria for v1

- A new user can go from "opening the app" to "task created, assigned, and labeled" in under a minute, with zero setup friction beyond the one-time profile creation.
- Returning users never have to re-identify themselves on the same device.
- An admin can adjust roles, labels, boards, statuses, and effort levels without needing code changes or developer involvement.
- The board(s) accurately reflect current work state at a glance — who's doing what, how much effort it is, and what's tagged with what.
