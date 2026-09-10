import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import type { Card, Status } from "../api/types";
import { Avatar, boardThemeVars, EffortPill, LabelPill } from "./ui";
import { CardDialog } from "./CardDialog";

interface Filters {
  text: string;
  assignee: string;
  label: string;
  effort: string;
}

const EMPTY_FILTERS: Filters = { text: "", assignee: "", label: "", effort: "" };

export function BoardView() {
  const {
    currentBoard,
    statuses,
    cards,
    labels,
    effortLevels,
    users,
    activeUsers,
    api,
    reloadCards,
  } = useStore();

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ statusId: string; index: number } | null>(
    null,
  );

  const readOnly = !!currentBoard?.is_archived;

  const userById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users],
  );
  const effortById = useMemo(
    () => Object.fromEntries(effortLevels.map((e) => [e.id, e])),
    [effortLevels],
  );
  const labelById = useMemo(
    () => Object.fromEntries(labels.map((l) => [l.id, l])),
    [labels],
  );

  const filtered = useMemo(() => {
    const t = filters.text.trim().toLowerCase();
    return cards.filter((c) => {
      if (t && !c.title.toLowerCase().includes(t)) return false;
      if (filters.assignee === "__none__" && c.assignee_id) return false;
      if (
        filters.assignee &&
        filters.assignee !== "__none__" &&
        c.assignee_id !== filters.assignee
      )
        return false;
      if (filters.label && !c.label_ids.includes(filters.label)) return false;
      if (filters.effort === "__none__" && c.effort_level_id) return false;
      if (
        filters.effort &&
        filters.effort !== "__none__" &&
        c.effort_level_id !== filters.effort
      )
        return false;
      return true;
    });
  }, [cards, filters]);

  const byStatus = useMemo(() => {
    const map: Record<string, Card[]> = {};
    for (const s of statuses) map[s.id] = [];
    for (const c of filtered) (map[c.status_id] ??= []).push(c);
    for (const k of Object.keys(map))
      map[k].sort((a, b) => a.position - b.position);
    return map;
  }, [filtered, statuses]);

  const openCard = openCardId ? cards.find((c) => c.id === openCardId) ?? null : null;
  const filtersActive =
    filters.text || filters.assignee || filters.label || filters.effort;

  async function quickAdd(statusId: string, title: string) {
    if (!title.trim() || !currentBoard) return;
    await api.createCard({
      board_id: currentBoard.id,
      status_id: statusId,
      title: title.trim(),
    });
    await reloadCards();
  }

  async function handleDrop(statusId: string, index: number) {
    const id = draggingId;
    setDraggingId(null);
    setDropTarget(null);
    if (!id) return;
    await api.moveCard(id, statusId, index);
    await reloadCards();
  }

  if (!currentBoard) {
    return <div className="empty-hint">No board selected. Create one from the header.</div>;
  }

  return (
    <div className="board-view" style={boardThemeVars(currentBoard.theme)}>
      {readOnly && (
        <div className="banner">
          “{currentBoard.name}” is archived. Cards are read-only — unarchive it from the
          Admin page to make changes.
        </div>
      )}

      <div className="filter-bar">
        <input
          placeholder="Search title…"
          value={filters.text}
          onChange={(e) => setFilters((f) => ({ ...f, text: e.target.value }))}
        />
        <select
          value={filters.assignee}
          onChange={(e) => setFilters((f) => ({ ...f, assignee: e.target.value }))}
        >
          <option value="">All assignees</option>
          <option value="__none__">Unassigned</option>
          {activeUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.emoji} {u.name}
            </option>
          ))}
        </select>
        <select
          value={filters.label}
          onChange={(e) => setFilters((f) => ({ ...f, label: e.target.value }))}
        >
          <option value="">All labels</option>
          {labels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select
          value={filters.effort}
          onChange={(e) => setFilters((f) => ({ ...f, effort: e.target.value }))}
        >
          <option value="">Any effort</option>
          <option value="__none__">No effort set</option>
          {effortLevels.map((eff) => (
            <option key={eff.id} value={eff.id}>
              {eff.name}
            </option>
          ))}
        </select>
        {filtersActive && (
          <button className="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
            Clear filters
          </button>
        )}
        <span className="inline-note">
          {filtered.length} / {cards.length} cards
        </span>
      </div>

      <div className="columns">
        {statuses.map((s) => (
          <ColumnView
            key={s.id}
            status={s}
            cards={byStatus[s.id] ?? []}
            readOnly={readOnly}
            draggingId={draggingId}
            dropTarget={dropTarget}
            onSetDropTarget={setDropTarget}
            onDragStartCard={setDraggingId}
            onDragEndCard={() => {
              setDraggingId(null);
              setDropTarget(null);
            }}
            onDrop={handleDrop}
            onQuickAdd={quickAdd}
            onOpenCard={setOpenCardId}
            userById={userById}
            effortById={effortById}
            labelById={labelById}
          />
        ))}
      </div>

      {openCard && (
        <CardDialog card={openCard} onClose={() => setOpenCardId(null)} />
      )}
    </div>
  );
}

function ColumnView({
  status,
  cards,
  readOnly,
  draggingId,
  dropTarget,
  onSetDropTarget,
  onDragStartCard,
  onDragEndCard,
  onDrop,
  onQuickAdd,
  onOpenCard,
  userById,
  effortById,
  labelById,
}: {
  status: Status;
  cards: Card[];
  readOnly: boolean;
  draggingId: string | null;
  dropTarget: { statusId: string; index: number } | null;
  onSetDropTarget: (t: { statusId: string; index: number } | null) => void;
  onDragStartCard: (id: string) => void;
  onDragEndCard: () => void;
  onDrop: (statusId: string, index: number) => void;
  onQuickAdd: (statusId: string, title: string) => void;
  onOpenCard: (id: string) => void;
  userById: Record<string, any>;
  effortById: Record<string, any>;
  labelById: Record<string, any>;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const isDragOverCol = dropTarget?.statusId === status.id;

  function submitQuick(e: React.FormEvent) {
    e.preventDefault();
    if (draft.trim()) {
      onQuickAdd(status.id, draft);
      setDraft("");
    }
  }

  return (
    <div
      className={"column" + (isDragOverCol ? " drag-over" : "")}
      onDragOver={(e) => {
        if (readOnly || !draggingId) return;
        e.preventDefault();
        if (!dropTarget || dropTarget.statusId !== status.id) {
          onSetDropTarget({ statusId: status.id, index: cards.length });
        }
      }}
      onDrop={(e) => {
        if (readOnly || !draggingId) return;
        e.preventDefault();
        onDrop(status.id, dropTarget?.statusId === status.id ? dropTarget.index : cards.length);
      }}
    >
      <div className="column-head">
        <span>{status.name}</span>
        <span className="count">{cards.length}</span>
        {status.is_locked && <span className="tag-lock" style={{ marginLeft: "auto" }}>base</span>}
      </div>

      <div className="column-body">
        {cards.map((c, i) => {
          const showIndicator =
            isDragOverCol && dropTarget?.index === i && draggingId !== c.id;
          return (
            <div
              key={c.id}
              draggable={!readOnly}
              onDragStart={() => onDragStartCard(c.id)}
              onDragEnd={onDragEndCard}
              onDragOver={(e) => {
                if (readOnly || !draggingId) return;
                e.preventDefault();
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const before = e.clientY < rect.top + rect.height / 2;
                const idx = before ? i : i + 1;
                if (
                  !dropTarget ||
                  dropTarget.statusId !== status.id ||
                  dropTarget.index !== idx
                ) {
                  onSetDropTarget({ statusId: status.id, index: idx });
                }
              }}
              className={
                "card" +
                (draggingId === c.id ? " dragging" : "") +
                (showIndicator ? " drop-before" : "")
              }
              onClick={() => onOpenCard(c.id)}
            >
              <div className="card-title">{c.title}</div>
              <div className="card-meta">
                {c.assignee_id ? (
                  <Avatar user={userById[c.assignee_id] ?? null} />
                ) : (
                  <span className="badge outline">unassigned</span>
                )}
                <EffortPill effort={effortById[c.effort_level_id ?? ""]} />
                {c.label_ids
                  .map((lid) => labelById[lid])
                  .filter(Boolean)
                  .map((l) => (
                    <LabelPill key={l.id} label={l} />
                  ))}
              </div>
            </div>
          );
        })}
        {isDragOverCol && dropTarget?.index === cards.length && draggingId && (
          <div className="card drop-before" style={{ height: 4, padding: 0 }} />
        )}
        {!cards.length && !draggingId && (
          <div className="empty-hint">No cards</div>
        )}
      </div>

      <div className="column-footer">
        {readOnly ? null : adding ? (
          <form className="quick-add" onSubmit={submitQuick}>
            <input
              autoFocus
              value={draft}
              placeholder="Card title, then Enter"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                if (!draft.trim()) setAdding(false);
              }}
            />
            <button type="submit" className="primary sm">
              Add
            </button>
          </form>
        ) : (
          <button className="sm" style={{ width: "100%" }} onClick={() => setAdding(true)}>
            + Add card
          </button>
        )}
      </div>
    </div>
  );
}
