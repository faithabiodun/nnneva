/**
 * The API's response shapes, mirroring `api/app/schemas.py`.
 *
 * Hand-written rather than generated: the API and the app ship together, and a
 * codegen step would cost more than it saves at this size. If they drift, the
 * server is right — its schemas are the ones enforcing the contract.
 */

export type TaskStatus =
  | "To do"
  | "In progress"
  | "Scheduled"
  | "Awaiting approval"
  | "Complete"
  | "Cancelled";

export type Task = {
  id: string;
  title: string;
  detail: string;
  status: TaskStatus;
  due_date: string | null;
  goal_id: string | null;
  created_by: "user" | "agent";
};

export type Goal = {
  id: string;
  title: string;
  status: "active" | "complete" | "abandoned";
  progress: number;
  created_by: "user" | "agent";
  tasks: Task[];
};

export type Question = { id: string; text: string; source: string; asked: boolean };
export type PreparationItem = { id: string; title: string; done: boolean };

export type Appointment = {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
  clinician: string | null;
  attended: boolean;
  questions: Question[];
  preparation: PreparationItem[];
};

/** The server splits these, because it owns the clock the split depends on. */
export type Appointments = { upcoming: Appointment[]; past: Appointment[] };

export type MemoryKind = "Pregnancy context" | "Preferences" | "Decisions";

export type MemoryItem = {
  id: string;
  kind: MemoryKind;
  fact: string;
  source: string;
  created_at: string;
};

/** What a tool call did, and how it ended. Drives the icon and the colour. */
export type ActionResult = "ok" | "blocked" | "awaiting_approval" | "failed";

export type AgentAction = {
  tool: string;
  summary: string;
  result: ActionResult;
  result_label: string;
  detail: string;
};

export type PlanState = "done" | "approval" | "approved" | "declined" | "flag" | "stopped";

export type PlanStep = {
  step_index: number;
  title: string;
  detail: string;
  state: PlanState;
};

export type Approval = {
  id: string;
  action: string;
  question: string;
  why: string;
  status: "pending" | "approved" | "declined";
};

export type RunStatus = "running" | "complete" | "awaiting_approval" | "escalated" | "failed";

export type SafetyBand = "none" | "routine" | "same_day" | "emergency";

export type AgentRun = {
  id: string;
  prompt: string;
  reply: string;
  status: RunStatus;
  /** Which planner produced this run. Never inferred — the server records it. */
  engine: "bedrock" | "scripted";
  safety_band: SafetyBand;
  created_at: string;
  duration_ms: number | null;
  actions: AgentAction[];
  plan_steps: PlanStep[];
  approvals: Approval[];
};

export type ActivityDay = { label: string; runs: AgentRun[] };

export type Profile = {
  full_name: string;
  email: string;
  phone: string | null;
  due_date: string | null;
  gestational_week: number | null;
  trimester: string | null;
  care_location: string | null;
  clinician: string | null;
  help_areas: string[];
  /** False when there is no pregnancy context yet — Google sign-in skips it. */
  onboarded: boolean;
  contact_window: string;
  retention: string;
  notifications: Record<string, boolean>;
  trusted_contact: {
    name: string;
    relationship: string;
    permissions: Record<string, boolean>;
  } | null;
};

export type Home = {
  greeting_name: string;
  gestational_week: number | null;
  due_date: string | null;
  today: Task[];
  goals: Goal[];
  next_appointment: Appointment | null;
  recent_actions: AgentAction[];
  pending_approvals: Approval[];
};

export type Token = { access_token: string; token_type: string; onboarded: boolean };
