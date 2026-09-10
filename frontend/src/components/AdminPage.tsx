import { useState } from "react";
import { useStore } from "../state/store";
import { COLOR_CHOICES, Avatar } from "./ui";
import { Modal } from "./Modal";

export function AdminPage() {
  const store = useStore();
  const { roles, labels, boards, statuses, effortLevels, users, api, reloadRefData } = store;

  const refresh = reloadRefData;

  return (
    <div className="admin">
      <h2 style={{ marginTop: 0 }}>Admin</h2>
      <p className="inline-note" style={{ marginTop: -8 }}>
        Shared reference data. Changes apply immediately across every board.
      </p>

      {/* ---- Roles ---- */}
      <NameCrudSection
        title="Roles"
        items={roles}
        onCreate={(n) => api.createRole(n).then(refresh)}
        onRename={(id, n) => api.updateRole(id, n).then(refresh)}
        onDelete={(id) => api.deleteRole(id).then(refresh)}
        deleteNote="Deleting a role clears it from any users who had it."
      />

      {/* ---- Labels ---- */}
      <LabelsSection
        labels={labels}
        onCreate={(n, c) => api.createLabel(n, c).then(refresh)}
        onUpdate={(id, patch) => api.updateLabel(id, patch).then(refresh)}
        onDelete={(id) => api.deleteLabel(id).then(refresh)}
      />

      {/* ---- Boards ---- */}
      <BoardsSection
        boards={boards}
        currentBoardId={store.currentBoardId}
        onCreate={(n) => api.createBoard(n).then(refresh)}
        onRename={(id, n) => api.renameBoard(id, n).then(refresh)}
        onArchive={(id, typed) => api.archiveBoard(id, typed).then(refresh)}
        onUnarchive={(id) => api.unarchiveBoard(id).then(refresh)}
      />

      {/* ---- Statuses ---- */}
      <OrderedCrudSection
        title="Card statuses"
        items={statuses}
        lockedNote="To Do, In Progress and Done are base statuses and cannot be renamed, reordered past locking, or deleted."
        deleteNote="Deleting a custom status moves its cards back to To Do."
        onCreate={(n) => api.createStatus(n).then(refresh)}
        onRename={(id, n) => api.updateStatus(id, n).then(refresh)}
        onDelete={(id) => api.deleteStatus(id).then(refresh)}
        onReorder={(ids) => api.reorderStatuses(ids).then(refresh)}
        isLocked={(it) => (it as { is_locked?: boolean }).is_locked === true}
      />

      {/* ---- Effort levels ---- */}
      <OrderedCrudSection
        title="Effort levels"
        items={effortLevels}
        deleteNote="Deleting an effort level clears it from any cards using it."
        onCreate={(n) => api.createEffortLevel(n).then(refresh)}
        onRename={(id, n) => api.updateEffortLevel(id, n).then(refresh)}
        onDelete={(id) => api.deleteEffortLevel(id).then(refresh)}
        onReorder={(ids) => api.reorderEffortLevels(ids).then(refresh)}
      />

      {/* ---- Users ---- */}
      <div className="admin-section">
        <h3>Users</h3>
        <div className="admin-list">
          {users.map((u) => (
            <div className={"admin-item" + (u.is_active ? "" : " locked")} key={u.id}>
              <Avatar user={u} />
              <span className="grow">
                <strong>{u.name}</strong>{" "}
                <span className="inline-note">
                  {u.email} · {roles.find((r) => r.id === u.role_id)?.name ?? "no role"}
                </span>
              </span>
              <span className="tag-lock">{u.is_active ? "active" : "inactive"}</span>
              <button
                className="sm"
                onClick={() => api.setUserActive(u.id, !u.is_active).then(refresh)}
              >
                {u.is_active ? "Mark inactive" : "Reactivate"}
              </button>
            </div>
          ))}
        </div>
        <p className="inline-note">
          Inactive users are hidden from assignee pickers but keep their history.
        </p>
      </div>

      <div className="admin-section">
        <h3>Danger zone</h3>
        <button
          className="danger sm"
          onClick={() => {
            if (confirm("Wipe all local demo data and reseed?"))
              api.resetAll().then(() => window.location.reload());
          }}
        >
          Reset demo data
        </button>
      </div>
    </div>
  );
}

/* ---------------- generic name CRUD ---------------- */

interface NamedItem {
  id: string;
  name: string;
}

function NameCrudSection({
  title,
  items,
  onCreate,
  onRename,
  onDelete,
  deleteNote,
}: {
  title: string;
  items: NamedItem[];
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  deleteNote?: string;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="admin-section">
      <h3>{title}</h3>
      <div className="admin-list">
        {items.map((it) => (
          <EditableRow
            key={it.id}
            name={it.name}
            onRename={(n) => onRename(it.id, n)}
            onDelete={() => onDelete(it.id)}
          />
        ))}
        {!items.length && <div className="empty-hint">Nothing yet.</div>}
      </div>
      <form
        className="add-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) {
            onCreate(draft.trim());
            setDraft("");
          }
        }}
      >
        <input
          placeholder={`New ${title.toLowerCase().replace(/s$/, "")}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="primary">
          Add
        </button>
      </form>
      {deleteNote && <p className="inline-note">{deleteNote}</p>}
    </div>
  );
}

function EditableRow({
  name,
  onRename,
  onDelete,
  locked,
  left,
}: {
  name: string;
  onRename: (name: string) => void;
  onDelete: () => void;
  locked?: boolean;
  left?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={"admin-item" + (locked ? " locked" : "")}>
      {left}
      {editing ? (
        <>
          <input
            className="grow"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button
            className="primary sm"
            onClick={() => {
              if (value.trim()) onRename(value.trim());
              setEditing(false);
            }}
          >
            Save
          </button>
          <button
            className="sm"
            onClick={() => {
              setValue(name);
              setEditing(false);
            }}
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <span className="grow">{name}</span>
          {locked ? (
            <span className="tag-lock">locked</span>
          ) : confirming ? (
            <>
              <span className="inline-note">Delete?</span>
              <button className="sm" onClick={() => setConfirming(false)}>
                No
              </button>
              <button className="danger sm" onClick={onDelete}>
                Yes
              </button>
            </>
          ) : (
            <>
              <button className="sm" onClick={() => setEditing(true)}>
                Rename
              </button>
              <button className="danger sm" onClick={() => setConfirming(true)}>
                Delete
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- labels ---------------- */

function LabelsSection({
  labels,
  onCreate,
  onUpdate,
  onDelete,
}: {
  labels: { id: string; name: string; color: string }[];
  onCreate: (name: string, color: string) => void;
  onUpdate: (id: string, patch: { name?: string; color?: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [color, setColor] = useState(COLOR_CHOICES[6]);

  return (
    <div className="admin-section">
      <h3>Labels</h3>
      <div className="admin-list">
        {labels.map((l) => (
          <div className="admin-item" key={l.id}>
            <input
              type="color"
              value={l.color}
              style={{ width: 40, padding: 2 }}
              onChange={(e) => onUpdate(l.id, { color: e.target.value })}
            />
            <EditableRow
              name={l.name}
              onRename={(n) => onUpdate(l.id, { name: n })}
              onDelete={() => onDelete(l.id)}
              left={
                <span className="badge" style={{ background: l.color }}>
                  {l.name}
                </span>
              }
            />
          </div>
        ))}
        {!labels.length && <div className="empty-hint">No labels yet.</div>}
      </div>
      <form
        className="add-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) {
            onCreate(draft.trim(), color);
            setDraft("");
          }
        }}
      >
        <input type="color" value={color} style={{ width: 44, padding: 2 }} onChange={(e) => setColor(e.target.value)} />
        <input placeholder="New label" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button type="submit" className="primary">
          Add
        </button>
      </form>
      <p className="inline-note">Deleting a label removes it from every card that had it.</p>
    </div>
  );
}

/* ---------------- boards ---------------- */

function BoardsSection({
  boards,
  currentBoardId,
  onCreate,
  onRename,
  onArchive,
  onUnarchive,
}: {
  boards: { id: string; name: string; is_archived: boolean }[];
  currentBoardId: string | null;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onArchive: (id: string, typed: string) => Promise<unknown>;
  onUnarchive: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const active = boards.filter((b) => !b.is_archived);
  const archived = boards.filter((b) => b.is_archived);

  return (
    <div className="admin-section">
      <h3>Boards</h3>
      <div className="admin-list">
        {active.map((b) => (
          <EditableRow
            key={b.id}
            name={b.name + (b.id === currentBoardId ? "  (viewing)" : "")}
            onRename={(n) => onRename(b.id, n.replace(/\s+\(viewing\)$/, ""))}
            onDelete={() => {
              setArchiveTarget({ id: b.id, name: b.name });
              setTyped("");
              setErr(null);
            }}
          />
        ))}
      </div>
      <form
        className="add-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) {
            onCreate(draft.trim());
            setDraft("");
          }
        }}
      >
        <input placeholder="New board" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button type="submit" className="primary">
          Add
        </button>
      </form>
      <p className="inline-note">
        Boards are never deleted — only archived. The Delete button opens the archive
        confirmation.
      </p>

      {archived.length > 0 && (
        <>
          <h4 style={{ margin: "14px 0 6px", color: "var(--text-dim)" }}>Archived</h4>
          <div className="admin-list">
            {archived.map((b) => (
              <div className="admin-item locked" key={b.id}>
                <span className="grow">{b.name}</span>
                <span className="tag-lock">archived</span>
                <button className="sm" onClick={() => onUnarchive(b.id)}>
                  Unarchive
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {archiveTarget && (
        <Modal title={`Archive “${archiveTarget.name}”`} onClose={() => setArchiveTarget(null)}>
          <p>
            Archiving hides this board and makes all of its cards read-only until it is
            unarchived. To confirm, type the board name exactly:
          </p>
          <input
            autoFocus
            value={typed}
            placeholder={archiveTarget.name}
            onChange={(e) => setTyped(e.target.value)}
          />
          {err && <div className="error-text">{err}</div>}
          <div className="modal-actions">
            <button onClick={() => setArchiveTarget(null)}>Cancel</button>
            <button
              className="danger"
              disabled={typed !== archiveTarget.name}
              onClick={async () => {
                try {
                  await onArchive(archiveTarget.id, typed);
                  setArchiveTarget(null);
                } catch (e) {
                  setErr((e as Error).message);
                }
              }}
            >
              Archive board
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- ordered CRUD (statuses / effort) ---------------- */

function OrderedCrudSection({
  title,
  items,
  onCreate,
  onRename,
  onDelete,
  onReorder,
  isLocked,
  lockedNote,
  deleteNote,
}: {
  title: string;
  items: NamedItem[];
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onReorder: (ids: string[]) => void;
  isLocked?: (it: NamedItem) => boolean;
  lockedNote?: string;
  deleteNote?: string;
}) {
  const [draft, setDraft] = useState("");

  function move(idx: number, dir: -1 | 1) {
    const next = [...items];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onReorder(next.map((x) => x.id));
  }

  return (
    <div className="admin-section">
      <h3>{title}</h3>
      <div className="admin-list">
        {items.map((it, idx) => {
          const locked = isLocked?.(it) ?? false;
          return (
            <div className={"admin-item" + (locked ? " locked" : "")} key={it.id}>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button className="sm" style={{ padding: "0 6px" }} disabled={idx === 0} onClick={() => move(idx, -1)}>
                  ▲
                </button>
                <button
                  className="sm"
                  style={{ padding: "0 6px" }}
                  disabled={idx === items.length - 1}
                  onClick={() => move(idx, 1)}
                >
                  ▼
                </button>
              </span>
              <EditableRow
                name={it.name}
                locked={locked}
                onRename={(n) => onRename(it.id, n)}
                onDelete={() => onDelete(it.id)}
              />
            </div>
          );
        })}
      </div>
      <form
        className="add-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) {
            onCreate(draft.trim());
            setDraft("");
          }
        }}
      >
        <input
          placeholder={`New ${title.toLowerCase()}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="primary">
          Add
        </button>
      </form>
      {lockedNote && <p className="inline-note">{lockedNote}</p>}
      {deleteNote && <p className="inline-note">{deleteNote}</p>}
    </div>
  );
}
