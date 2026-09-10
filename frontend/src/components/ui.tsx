import type { CSSProperties } from "react";
import type { BoardTheme, EffortLevel, Label, User } from "../api/types";

export const COLOR_CHOICES = [
  "#4f46e5", "#7c3aed", "#db2777", "#e11d48", "#ea580c", "#d97706",
  "#16a34a", "#059669", "#0891b2", "#2563eb", "#475569", "#0f172a",
];

export const EMOJI_CHOICES = [
  "🦊", "🐙", "🦄", "🐢", "🐼", "🦁", "🐸", "🐝", "🦉", "🐧",
  "🦖", "🐳", "🦩", "🦇", "🐬", "🦔", "🐥", "🦕", "🐜", "🦋",
];

/**
 * Turn a board theme into CSS custom properties that override the palette
 * defined in styles.css. Spread onto the `style` of a wrapper element.
 */
export function boardThemeVars(theme: BoardTheme | undefined): CSSProperties {
  if (!theme) return {};
  const { base_color: base, secondary_color: secondary } = theme;
  return {
    "--primary": base,
    "--primary-dark": `color-mix(in srgb, ${base} 78%, black)`,
    "--primary-soft": `color-mix(in srgb, ${base} 14%, white)`,
    "--accent": secondary,
    "--accent-dark": `color-mix(in srgb, ${secondary} 72%, black)`,
    "--accent-soft": `color-mix(in srgb, ${secondary} 16%, white)`,
    // Tint the board backdrop and the columns with the base colour.
    "--bg": `color-mix(in srgb, ${base} 9%, white)`,
    "--surface-2": `color-mix(in srgb, ${base} 13%, white)`,
    "--border": `color-mix(in srgb, ${base} 22%, white)`,
  } as CSSProperties;
}

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
