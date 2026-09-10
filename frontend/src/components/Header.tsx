import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import { Avatar } from "./ui";
import { Modal } from "./Modal";

export function Header({
  view,
  onView,
  onSwitchIdentity,
}: {
  view: "board" | "admin";
  onView: (v: "board" | "admin") => void;
  onSwitchIdentity: () => void;
}) {
  const {
    currentUser,
    activeBoards,
    currentBoardId,
    setCurrentBoardId,
    reloadRefData,
    api,
    signOut,
  } = useStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function createBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    const b = await api.createBoard(newBoardName.trim());
    await reloadRefData();
    setCurrentBoardId(b.id);
    setNewBoardName("");
    setCreating(false);
    onView("board");
  }

  return (
    <header className="header">
      <span className="brand">📚 Stacked</span>

      <button
        className={"nav-tab" + (view === "board" ? " active" : "")}
        onClick={() => onView("board")}
      >
        Board
      </button>
      <button
        className={"nav-tab" + (view === "admin" ? " active" : "")}
        onClick={() => onView("admin")}
      >
        Admin
      </button>

      {view === "board" && (
        <>
          <select
            aria-label="Select board"
            value={currentBoardId ?? ""}
            onChange={(e) => setCurrentBoardId(e.target.value)}
            style={{ width: "auto", minWidth: 180 }}
          >
            {activeBoards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button className="sm" onClick={() => setCreating(true)}>
            + New board
          </button>
        </>
      )}

      <span className="spacer" />

      <div className="menu" ref={menuRef}>
        <button className="ghost" onClick={() => setMenuOpen((v) => !v)}>
          <Avatar user={currentUser} />{" "}
          <span style={{ marginLeft: 6, fontWeight: 700 }}>
            {currentUser?.name ?? "Guest"}
          </span>{" "}
          ▾
        </button>
        {menuOpen && (
          <div className="menu-pop">
            <div className="inline-note" style={{ padding: "4px 8px" }}>
              {currentUser?.email}
            </div>
            <hr />
            <button
              onClick={() => {
                setMenuOpen(false);
                onSwitchIdentity();
              }}
            >
              Switch identity…
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                signOut();
              }}
            >
              Sign out of this device
            </button>
          </div>
        )}
      </div>

      {creating && (
        <Modal title="Create a board" onClose={() => setCreating(false)}>
          <form onSubmit={createBoard}>
            <label className="field">
              <span>Board name</span>
              <input
                autoFocus
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="e.g. Q4 Planning"
              />
            </label>
            <div className="modal-actions">
              <button type="button" onClick={() => setCreating(false)}>
                Cancel
              </button>
              <button type="submit" className="primary">
                Create
              </button>
            </div>
          </form>
        </Modal>
      )}
    </header>
  );
}
