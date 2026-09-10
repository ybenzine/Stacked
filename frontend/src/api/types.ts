// Shared domain types. These mirror the conceptual data model in _docs/specs.md
// and are the contract the real backend will need to honour.

export type ID = string;

export type RoleName =
  | "Software Engineer"
  | "QA Engineer"
  | "Product Owner"
  | "Customer Success";

export interface Role {
  id: ID;
  name: string;
}

export interface User {
  id: ID;
  name: string;
  email: string;
  role_id: ID | null;
  color: string; // hex
  emoji: string;
  is_active: boolean;
}

export interface Board {
  id: ID;
  name: string;
  is_archived: boolean;
}

export interface Status {
  id: ID;
  name: string;
  position: number;
  is_locked: boolean; // true for To Do / In Progress / Done
}

export interface Label {
  id: ID;
  name: string;
  color: string; // hex
}

export interface EffortLevel {
  id: ID;
  name: string;
  position: number;
}

export interface ActivityLogEntry {
  id: ID;
  card_id: ID;
  user_id: ID | null;
  description: string;
  created_at: string; // ISO
}

export interface Card {
  id: ID;
  board_id: ID;
  status_id: ID;
  title: string;
  description: string;
  assignee_id: ID | null;
  creator_id: ID | null;
  effort_level_id: ID | null;
  label_ids: ID[];
  position: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  activity: ActivityLogEntry[];
}

export interface Bootstrap {
  users: User[];
  roles: Role[];
  boards: Board[];
  statuses: Status[];
  labels: Label[];
  effortLevels: EffortLevel[];
}

export interface NewUserInput {
  name: string;
  email: string;
  role_id: ID | null;
  color: string;
  emoji: string;
}

export interface CardPatch {
  title?: string;
  description?: string;
  assignee_id?: ID | null;
  effort_level_id?: ID | null;
  label_ids?: ID[];
}
