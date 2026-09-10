import type { EffortLevel, Label, User } from "../api/types";

export const COLOR_CHOICES = [
  "#4f46e5", "#7c3aed", "#db2777", "#e11d48", "#ea580c", "#d97706",
  "#16a34a", "#059669", "#0891b2", "#2563eb", "#475569", "#0f172a",
];

export const EMOJI_CHOICES = [
  "🦊", "🐙", "🦄", "🐢", "🐼", "🦁", "🐸", "🐝", "🦉", "🐧",
  "🦖", "🐳", "🦩", "🦇", "🐬", "🦔", "🐥", "🦕", "🐜", "🦋",
];

export function Avatar({ user, size = 22 }: { user: User | null; size?: number }) {
  if (!user) {
    return (
      <span
        className="avatar"
        style={{ width: size, height: size, background: "#e2e8f0" }}
        title="Unassigned"
      >
        ·
      </span>
    );
  }
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: user.color }}
      title={user.name}
    >
      {user.emoji}
    </span>
  );
}

export function LabelPill({ label }: { label: Label }) {
  return (
    <span className="badge" style={{ background: label.color }}>
      {label.name}
    </span>
  );
}

export function EffortPill({ effort }: { effort: EffortLevel | undefined }) {
  if (!effort) return null;
  return <span className="effort-dot">{effort.name}</span>;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
