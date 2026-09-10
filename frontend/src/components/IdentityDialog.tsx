import { useState } from "react";
import { useStore } from "../state/store";
import { Modal } from "./Modal";
import { Avatar, COLOR_CHOICES, EMOJI_CHOICES } from "./ui";

export function IdentityDialog({
  allowClose,
  onClose,
}: {
  allowClose: boolean;
  onClose: () => void;
}) {
  const { users, roles, signInWithProfile, signInAsExisting, lookupEmail } = useStore();
  const [tab, setTab] = useState<"pick" | "new">(users.length ? "pick" : "new");

  // new-profile form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<string>(roles[0]?.id ?? "");
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function checkEmail() {
    if (!email.trim()) return;
    const found = await lookupEmail(email);
    if (found) {
      setName(found.name);
      setRoleId(found.role_id ?? roles[0]?.id ?? "");
      setColor(found.color);
      setEmoji(found.emoji);
      setNote(`Existing profile found for ${found.email} — continuing will reattach to it.`);
    } else {
      setNote(null);
    }
  }

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setBusy(true);
    try {
      await signInWithProfile({
        name: name.trim(),
        email: email.trim(),
        role_id: roleId || null,
        color,
        emoji,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={allowClose ? "Switch identity" : "Welcome to Stacked"}
      onClose={allowClose ? onClose : () => {}}
    >
      {!allowClose && (
        <p className="inline-note" style={{ marginTop: -8, marginBottom: 12 }}>
          Identify yourself once — no password. You'll be remembered on this device.
        </p>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <button
          className={"nav-tab" + (tab === "pick" ? " active" : "")}
          disabled={!users.length}
          onClick={() => setTab("pick")}
        >
          Use an existing profile
        </button>
        <button
          className={"nav-tab" + (tab === "new" ? " active" : "")}
          onClick={() => setTab("new")}
        >
          Create a new profile
        </button>
      </div>

      {tab === "pick" && (
        <div className="admin-list">
          {users.map((u) => (
            <button
              key={u.id}
              className="admin-item"
              style={{ textAlign: "left" }}
              onClick={() => {
                signInAsExisting(u.id);
                onClose();
              }}
            >
              <Avatar user={u} />
              <span className="grow">
                <strong>{u.name}</strong>
                <span className="inline-note"> {u.email}</span>
              </span>
              {!u.is_active && <span className="tag-lock">inactive</span>}
            </button>
          ))}
          {!users.length && <div className="empty-hint">No profiles yet.</div>}
        </div>
      )}

      {tab === "new" && (
        <form onSubmit={submitNew}>
          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={checkEmail}
              required
            />
          </label>
          {note && <div className="inline-note">{note}</div>}
          <label className="field">
            <span>Role</span>
            <select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              <option value="">— none —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Color</span>
            <div className="swatch-grid">
              {COLOR_CHOICES.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={"swatch" + (c === color ? " selected" : "")}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
          </label>
          <label className="field">
            <span>Emoji</span>
            <div className="emoji-grid">
              {EMOJI_CHOICES.map((em) => (
                <button
                  type="button"
                  key={em}
                  className={"emoji-btn" + (em === emoji ? " selected" : "")}
                  onClick={() => setEmoji(em)}
                >
                  {em}
                </button>
              ))}
            </div>
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 2px" }}>
            <span className="inline-note">Preview:</span>
            <Avatar user={{ id: "", name, email, role_id: null, color, emoji, is_active: true }} />
            <strong>{name || "Your name"}</strong>
          </div>

          <div className="modal-actions">
            {allowClose && (
              <button type="button" onClick={onClose}>
                Cancel
              </button>
            )}
            <button type="submit" className="primary" disabled={busy}>
              {busy ? "Saving…" : "Continue"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
