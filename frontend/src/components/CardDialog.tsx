import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import type { Card } from "../api/types";
import { Modal } from "./Modal";
import { formatDate } from "./ui";

export function CardDialog({ card, onClose }: { card: Card; onClose: () => void }) {
  const {
    users,
    activeUsers,
    labels,
    effortLevels,
    statuses,
    currentBoard,
    api,
    reloadCards,
  } = useStore();

  const readOnly = !!currentBoard?.is_archived || card.is_archived;

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [assigneeId, setAssigneeId] = useState(card.assignee_id ?? "");
  const [effortId, setEffortId] = useState(card.effort_level_id ?? "");
  const [labelIds, setLabelIds] = useState<string[]>(card.label_ids);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const creator = users.find((u) => u.id === card.creator_id) ?? null;
  const userById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users],
  );

  const dirty =
    title !== card.title ||
    description !== card.description ||
    (assigneeId || null) !== card.assignee_id ||
    (effortId || null) !== card.effort_level_id ||
    labelIds.slice().sort().join() !== card.label_ids.slice().sort().join();

  async function save() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.updateCard(card.id, {
        title: title.trim(),
        description,
        assignee_id: assigneeId || null,
        effort_level_id: effortId || null,
        label_ids: labelIds,
      });
      await reloadCards();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function moveTo(statusId: string) {
    setBusy(true);
    try {
      await api.moveCard(card.id, statusId, Number.MAX_SAFE_INTEGER);
      await reloadCards();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    setBusy(true);
    try {
      await api.deleteCard(card.id);
      await reloadCards();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  function toggleLabel(id: string) {
    setLabelIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  return (
    <Modal title={readOnly ? "Card (read-only)" : "Edit card"} onClose={onClose} wide>
      {readOnly && (
        <div className="banner" style={{ margin: "0 0 14px" }}>
          This board is archived — cards are read-only.
        </div>
      )}

      <label className="field">
        <span>Title</span>
        <input
          value={title}
          disabled={readOnly}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label className="field">
        <span>Description</span>
        <textarea
          value={description}
          disabled={readOnly}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add more detail…"
        />
      </label>

      <div className="row">
        <label className="field">
          <span>Assignee</span>
          <select
            value={assigneeId}
            disabled={readOnly}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <option value="">— Unassigned —</option>
            {activeUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.emoji} {u.name}
              </option>
            ))}
            {/* keep a currently-assigned inactive user visible */}
            {assigneeId &&
              !activeUsers.some((u) => u.id === assigneeId) &&
              userById[assigneeId] && (
                <option value={assigneeId}>
                  {userById[assigneeId].emoji} {userById[assigneeId].name} (inactive)
                </option>
              )}
          </select>
        </label>

        <label className="field">
          <span>Effort</span>
          <select
            value={effortId}
            disabled={readOnly}
            onChange={(e) => setEffortId(e.target.value)}
          >
            <option value="">— None —</option>
            {effortLevels.map((eff) => (
              <option key={eff.id} value={eff.id}>
                {eff.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Status</span>
          <select
            value={card.status_id}
            disabled={readOnly}
            onChange={(e) => moveTo(e.target.value)}
          >
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span>Labels</span>
        <div className="swatch-grid" style={{ gap: 6 }}>
          {labels.map((l) => {
            const on = labelIds.includes(l.id);
            return (
              <button
                key={l.id}
                type="button"
                disabled={readOnly}
                className={"chip-toggle" + (on ? " on" : "")}
                style={on ? { background: l.color, borderColor: l.color } : undefined}
                onClick={() => toggleLabel(l.id)}
              >
                {l.name}
              </button>
            );
          })}
          {!labels.length && <span className="inline-note">No labels defined yet.</span>}
        </div>
      </label>

      <div className="inline-note">
        Created by {creator?.name ?? "—"} · {formatDate(card.created_at)} · updated{" "}
        {formatDate(card.updated_at)}
      </div>

      {error && <div className="error-text">{error}</div>}

      {!readOnly && (
        <div className="modal-actions">
          {!confirmDelete ? (
            <button className="danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          ) : (
            <>
              <span className="inline-note" style={{ alignSelf: "center" }}>
                Delete this card?
              </span>
              <button onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="danger" disabled={busy} onClick={doDelete}>
                Confirm delete
              </button>
            </>
          )}
          <span className="spacer" />
          <button onClick={onClose}>Close</button>
          <button className="primary" disabled={busy || !dirty} onClick={save}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}

      <div className="activity-log">
        <strong style={{ fontSize: 12, color: "var(--text-dim)" }}>ACTIVITY</strong>
        {[...card.activity].reverse().map((a) => (
          <div className="activity-entry" key={a.id}>
            <span className="who">{userById[a.user_id ?? ""]?.name ?? "Someone"}</span>
            <span>{a.description}</span>
            <span style={{ marginLeft: "auto" }}>{formatDate(a.created_at)}</span>
          </div>
        ))}
        {!card.activity.length && <div className="inline-note">No activity yet.</div>}
      </div>
    </Modal>
  );
}
