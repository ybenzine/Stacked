import type {
  Board,
  BoardTheme,
  Card,
  EffortLevel,
  Label,
  Role,
  Status,
  User,
} from "./types";

/** Named starting points offered in the admin theme picker. */
export interface BoardThemePreset extends BoardTheme {
  name: string;
}

export const BOARD_THEME_PRESETS: BoardThemePreset[] = [
  { name: "Ocean", base_color: "#2f7fe4", secondary_color: "#f7c948" },
  { name: "Forest", base_color: "#16a34a", secondary_color: "#d97706" },
  { name: "Sunset", base_color: "#ea580c", secondary_color: "#db2777" },
  { name: "Grape", base_color: "#7c3aed", secondary_color: "#06b6d4" },
  { name: "Slate", base_color: "#475569", secondary_color: "#0ea5e9" },
  { name: "Rose", base_color: "#e11d48", secondary_color: "#f59e0b" },
];

export const DEFAULT_BOARD_THEME: BoardTheme = {
  base_color: BOARD_THEME_PRESETS[0].base_color,
  secondary_color: BOARD_THEME_PRESETS[0].secondary_color,
};

export const uid = (): string =>
  "id_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const now = (): string => new Date().toISOString();

export interface DB {
  users: User[];
  roles: Role[];
  boards: Board[];
  statuses: Status[];
  labels: Label[];
  effortLevels: EffortLevel[];
  cards: Card[];
}

export function buildSeed(): DB {
  const roles: Role[] = [
    { id: "role_se", name: "Software Engineer" },
    { id: "role_qa", name: "QA Engineer" },
    { id: "role_po", name: "Product Owner" },
    { id: "role_cs", name: "Customer Success" },
  ];

  const users: User[] = [
    {
      id: "user_jane",
      name: "Jane Doe",
      email: "jane@example.com",
      role_id: "role_se",
      color: "#4f46e5",
      emoji: "🦊",
      is_active: true,
    },
    {
      id: "user_john",
      name: "John Smith",
      email: "john@example.com",
      role_id: "role_qa",
      color: "#0891b2",
      emoji: "🐙",
      is_active: true,
    },
    {
      id: "user_amy",
      name: "Amy Wong",
      email: "amy@example.com",
      role_id: "role_po",
      color: "#db2777",
      emoji: "🦄",
      is_active: true,
    },
    {
      id: "user_raj",
      name: "Raj Patel",
      email: "raj@example.com",
      role_id: "role_cs",
      color: "#ea580c",
      emoji: "🐢",
      is_active: false,
    },
  ];

  const statuses: Status[] = [
    { id: "status_todo", name: "To Do", position: 0, is_locked: true },
    { id: "status_progress", name: "In Progress", position: 1, is_locked: true },
    { id: "status_review", name: "Review", position: 2, is_locked: false },
    { id: "status_done", name: "Done", position: 3, is_locked: true },
  ];

  const labels: Label[] = [
    { id: "label_bug", name: "Bug", color: "#dc2626" },
    { id: "label_feature", name: "Feature", color: "#16a34a" },
    { id: "label_chore", name: "Chore", color: "#64748b" },
    { id: "label_blocked", name: "Blocked", color: "#b91c1c" },
  ];

  const effortLevels: EffortLevel[] = [
    { id: "effort_low", name: "Low", position: 0 },
    { id: "effort_medium", name: "Medium", position: 1 },
    { id: "effort_high", name: "High", position: 2 },
    { id: "effort_highest", name: "Highest", position: 3 },
  ];

  const boards: Board[] = [
    {
      id: "board_eng",
      name: "Engineering",
      is_archived: false,
      theme: { ...DEFAULT_BOARD_THEME },
    },
    {
      id: "board_mkt",
      name: "Marketing Launch",
      is_archived: false,
      theme: {
        base_color: BOARD_THEME_PRESETS[2].base_color,
        secondary_color: BOARD_THEME_PRESETS[2].secondary_color,
      },
    },
    {
      id: "board_old",
      name: "2023 Cleanup",
      is_archived: true,
      theme: {
        base_color: BOARD_THEME_PRESETS[4].base_color,
        secondary_color: BOARD_THEME_PRESETS[4].secondary_color,
      },
    },
  ];

  const t = now();
  const mkCard = (c: Partial<Card> & Pick<Card, "title" | "status_id" | "position">): Card => ({
    id: uid(),
    board_id: "board_eng",
    description: "",
    assignee_id: null,
    creator_id: "user_jane",
    effort_level_id: null,
    label_ids: [],
    is_archived: false,
    created_at: t,
    updated_at: t,
    activity: [],
    ...c,
  });

  const cards: Card[] = [
    mkCard({
      title: "Set up CI pipeline",
      status_id: "status_progress",
      position: 0,
      description: "GitHub Actions running lint + pytest on every PR.",
      assignee_id: "user_jane",
      effort_level_id: "effort_medium",
      label_ids: ["label_chore"],
    }),
    mkCard({
      title: "Login page returns 500 on empty email",
      status_id: "status_todo",
      position: 0,
      assignee_id: "user_john",
      effort_level_id: "effort_high",
      label_ids: ["label_bug"],
    }),
    mkCard({
      title: "Drag-and-drop card reordering",
      status_id: "status_todo",
      position: 1,
      effort_level_id: "effort_highest",
      label_ids: ["label_feature"],
    }),
    mkCard({
      title: "Write onboarding docs",
      status_id: "status_review",
      position: 0,
      assignee_id: "user_amy",
      effort_level_id: "effort_low",
    }),
    mkCard({
      title: "Pick a color palette",
      status_id: "status_done",
      position: 0,
      assignee_id: "user_jane",
      label_ids: ["label_chore"],
    }),
    mkCard({
      board_id: "board_mkt",
      title: "Draft launch email",
      status_id: "status_todo",
      position: 0,
      assignee_id: "user_amy",
      effort_level_id: "effort_medium",
    }),
    mkCard({
      board_id: "board_mkt",
      title: "Book venue",
      status_id: "status_progress",
      position: 0,
      effort_level_id: "effort_high",
      label_ids: ["label_blocked"],
    }),
    mkCard({
      board_id: "board_old",
      title: "Archived board card (read-only)",
      status_id: "status_done",
      position: 0,
      is_archived: true,
    }),
  ];

  return { users, roles, boards, statuses, labels, effortLevels, cards };
}
