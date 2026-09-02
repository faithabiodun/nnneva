/**
 * The demo dataset behind the signed-in screens. It is one coherent story —
 * Faith, 32 weeks, preparing for Thursday's antenatal review and an outstanding
 * blood test — so the same run appears on Home, Tasks, Appointments, Activity
 * and Memory rather than each screen inventing its own facts.
 *
 * This is stand-in data for the frontend. The API replaces it screen by screen.
 */

/* ---- Tasks ------------------------------------------------------------- */

/** The states a task can sit in. Order matters: it drives the filter chips. */
export type TaskStatus =
  | "Complete"
  | "In progress"
  | "Scheduled"
  | "To do"
  | "Awaiting approval";

export type Task = {
  id: string;
  title: string;
  due: string;
  status: TaskStatus;
  /** Whether the demo starts with this one ticked. */
  done?: boolean;
};

export type Goal = {
  title: string;
  meta: string;
  pct: number;
  /** The bar colour tracks urgency, not progress: pink waits on her, amber is soft. */
  bar: "green" | "pink" | "amber";
  tasks: Task[];
};

export const GOALS: Goal[] = [
  {
    title: "Prepare for the antenatal appointment",
    meta: "Thursday 10 September · created by Nnneva",
    pct: 75,
    bar: "green",
    tasks: [
      { id: "g1a", title: "Write questions for the midwife", due: "Done", status: "Complete", done: true },
      {
        id: "g1b",
        title: "Confirm the appointment time with the clinic",
        due: "Done",
        status: "Complete",
        done: true,
      },
      { id: "g1c", title: "Pack the folder with previous results", due: "Wed 9 Sep", status: "In progress" },
      { id: "g1d", title: "Arrange transport for 08:45", due: "Wed 9 Sep", status: "To do" },
    ],
  },
  {
    title: "Complete the third-trimester blood test",
    meta: "Before week 34 · created by Nnneva",
    pct: 20,
    bar: "pink",
    tasks: [
      { id: "g2a", title: "Book a lab slot at Lagoon", due: "Tue 8 Sep", status: "Awaiting approval" },
      { id: "g2b", title: "Fast from 21:00 the night before", due: "Wed 9 Sep", status: "Scheduled" },
      { id: "g2c", title: "Collect the results", due: "Fri 12 Sep", status: "To do" },
    ],
  },
  {
    title: "Hospital bag ready by week 35",
    meta: "Target 28 September · created by you",
    pct: 10,
    bar: "amber",
    tasks: [
      { id: "g3a", title: "Decide what goes in the bag", due: "Sat 13 Sep", status: "To do" },
      { id: "g3b", title: "Buy the missing items", due: "Sun 21 Sep", status: "To do" },
    ],
  },
];

export const TASK_FILTERS = ["All", "In progress", "Awaiting approval", "Done"] as const;
export type TaskFilter = (typeof TASK_FILTERS)[number];

/** Status pill colours, shared by Tasks and the Home plan summary. */
export const STATUS_TONE: Record<TaskStatus, string> = {
  Complete: "bg-green-wash text-green",
  "In progress": "bg-[#EAF0FA] text-[#3A5A8C]",
  Scheduled: "bg-surface-2 text-muted-2",
  "To do": "bg-surface-2 text-muted-2",
  "Awaiting approval": "bg-pink-wash text-pink-deep",
};

export const GOAL_BAR: Record<Goal["bar"], string> = {
  green: "bg-green",
  pink: "bg-pink",
  amber: "bg-[#B26D14]",
};

/* ---- The agent run ------------------------------------------------------ */

/**
 * A plan step's state decides its icon and its wording. `approval` is the only
 * one that stops the run: nothing past it happens until she answers.
 */
export type StepState = "done" | "approval" | "approved" | "declined" | "flag" | "stopped";

export type PlanStep = { title: string; detail: string; state: StepState };

export const PREP_PLAN: PlanStep[] = [
  {
    title: "Read your pregnancy context",
    detail: "32 weeks, Lagoon Antenatal Clinic, appointment Thursday 09:30",
    state: "done",
  },
  {
    title: "Check the request for red flags",
    detail: "No urgent symptoms in this message. Normal automation allowed.",
    state: "done",
  },
  {
    title: "Prepare questions for the visit",
    detail: "6 questions saved, including 2 carried over from your last visit",
    state: "done",
  },
  {
    title: "Create the tasks",
    detail: "Book lab slot, fast from 21:00, pack previous results, arrange transport",
    state: "done",
  },
  {
    title: "Share the reminder with Chidi",
    detail: "Sends health information outside your account, so it waits for you",
    state: "approval",
  },
  {
    title: "Save what happened to memory",
    detail: "Blood test due before week 34. Fasting required.",
    state: "done",
  },
];

export const FLAG_PLAN: PlanStep[] = [
  {
    title: "Read your pregnancy context",
    detail: "32 weeks, third trimester, no recorded blood pressure this week",
    state: "done",
  },
  {
    title: "Check the request for red flags",
    detail: "Severe headache with visual change at 32 weeks matched an escalation rule",
    state: "flag",
  },
  {
    title: "Stop normal automation",
    detail: "2 queued task actions cancelled. Nothing was created.",
    state: "stopped",
  },
  {
    title: "Record the safety event",
    detail: "Escalation shown. Waiting for you to confirm you have been seen.",
    state: "done",
  },
];

export const PREP_MESSAGE =
  "I have an antenatal appointment next Thursday. I need to prepare questions, get my blood test done, and remember everything I need.";

export const FLAG_MESSAGE =
  "I have had a bad headache since last night and my vision keeps going blurry. Can you add something to my tasks so I remember to mention it on Thursday?";

export const PREP_REPLY =
  "Done. Thursday is set up.\n\nSix questions are saved for Grace, four tasks are on your list, and three reminders are scheduled. The only thing left is whether I can send the blood test reminder to Chidi as well.";

export const APPROVAL_TEXT =
  "Send the blood test reminder to Chidi Adeyemi as well? This shares a health-related task outside your account.";

export const PREP_SUGGESTIONS = [
  "What should I ask about the blood test?",
  "Move the transport task to Wednesday",
  "What is still unfinished?",
];

export const FLAG_SUGGESTIONS = [
  "I have called the clinic",
  "What symptoms should I watch for?",
  "Resume my tasks",
];

/* ---- Appointments ------------------------------------------------------- */

export const NEXT_VISIT = {
  month: "Sep",
  day: "10",
  weekday: "Thursday",
  title: "Antenatal review",
  when: "09:30 · Lagoon Antenatal Clinic, Victoria Island",
  clinician: "Midwife Grace Okonkwo",
};

export const QUESTIONS = [
  { n: "01", text: "Is my blood pressure still in the normal range for 32 weeks?", source: "From last visit" },
  { n: "02", text: "What should I expect from the third-trimester blood test?", source: "Nnneva" },
  { n: "03", text: "Is the swelling in my feet in the evenings normal?", source: "You, 3 Sep" },
  { n: "04", text: "When should I stop travelling to work?", source: "You, 1 Sep" },
  { n: "05", text: "What are the signs that I should come in before Thursday?", source: "Nnneva" },
  { n: "06", text: "Can we go through the birth plan at the next visit?", source: "From last visit" },
];

export const PREP_ITEMS = [
  { id: "p1", title: "Bring the previous test results", done: true },
  { id: "p2", title: "Bring the antenatal card", done: true },
  { id: "p3", title: "Note weight and blood pressure at home", done: true },
  { id: "p4", title: "Arrange transport for 08:45", done: false },
];

export const PAST_VISITS = [
  { title: "Antenatal review", date: "20 August · Grace Okonkwo" },
  { title: "Glucose tolerance test", date: "6 August · Lagoon Lab" },
  { title: "Growth scan", date: "23 July · Dr Bello" },
];

/* ---- Activity ----------------------------------------------------------- */

/**
 * `kind` is what the filter chips sort on, and it also picks the icon: an
 * approval is still waiting, a safety check is a stop, everything else is done.
 */
export type ActionKind = "action" | "approval" | "safety";

export type AgentAction = { text: string; result: string; kind: ActionKind };

export type AgentRun = {
  goal: string;
  status: string;
  time: string;
  tone: "green" | "pink" | "danger";
  actions: AgentAction[];
};

export const ACTIVITY_DAYS: { label: string; runs: AgentRun[] }[] = [
  {
    label: "Today, 8 September",
    runs: [
      {
        goal: "Prepare for Thursday's appointment and blood test",
        status: "1 approval pending",
        time: "07:04",
        tone: "pink",
        actions: [
          { text: "Loaded your pregnancy profile and clinic", result: "Read", kind: "action" },
          { text: "Screened the request for red flags", result: "No flags", kind: "safety" },
          { text: "Saved 6 questions for Grace Okonkwo", result: "Prepared", kind: "action" },
          { text: "Created 4 tasks with due dates", result: "Created", kind: "action" },
          {
            text: "Asked to share the reminder with Chidi",
            result: "Waiting for you",
            kind: "approval",
          },
          {
            text: "Remembered the blood test is due before week 34",
            result: "Saved",
            kind: "action",
          },
        ],
      },
    ],
  },
  {
    label: "Yesterday, 7 September",
    runs: [
      {
        goal: "Weekly check of unfinished work",
        status: "Complete",
        time: "20:00",
        tone: "green",
        actions: [
          { text: "Reviewed 3 active plans", result: "Read", kind: "action" },
          { text: "Moved the hospital bag target to week 35", result: "Updated", kind: "action" },
          { text: "Set a reminder for Monday evening", result: "Scheduled", kind: "action" },
        ],
      },
      {
        goal: "Question about back pain at 32 weeks",
        status: "Answered",
        time: "14:12",
        tone: "green",
        actions: [
          { text: "Checked the symptom against escalation rules", result: "No flags", kind: "safety" },
          {
            text: "Remembered that back pain happens in the evenings",
            result: "Saved",
            kind: "action",
          },
        ],
      },
    ],
  },
];

export const ACTIVITY_FILTERS = ["All", "Actions", "Approvals", "Safety"] as const;
export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number];

/* ---- Memory -------------------------------------------------------------- */

export const MEMORY_GROUPS = [
  {
    label: "Pregnancy context",
    items: [
      { fact: "Due 14 November 2026. Currently 32 weeks.", source: "From onboarding, 12 August" },
      { fact: "Care at Lagoon Antenatal Clinic, Victoria Island.", source: "From onboarding, 12 August" },
      { fact: "Third-trimester blood test still outstanding.", source: "From your message, 8 September" },
      { fact: "Midwife Grace Okonkwo is the usual clinician.", source: "From appointment record, 20 August" },
    ],
  },
  {
    label: "Preferences",
    items: [
      { fact: "Prefers reminders in the evening, not before 08:00.", source: "From your message, 25 August" },
      { fact: "Does not want daily baby-size updates.", source: "From settings, 12 August" },
      { fact: "Travels to the clinic by ride-hailing, needs 40 minutes.", source: "From your message, 1 September" },
      { fact: "Chidi is the trusted contact, permissions limited.", source: "From onboarding, 12 August" },
    ],
  },
  {
    label: "Decisions",
    items: [
      { fact: "Declined sharing the glucose result with Chidi on 30 August.", source: "From an approval you refused" },
      { fact: "Hospital bag target date moved to week 35.", source: "From your message, 3 September" },
    ],
  },
];

export const MEMORY_COUNT = MEMORY_GROUPS.reduce((n, g) => n + g.items.length, 0);

/* ---- Profile -------------------------------------------------------------- */

export const PROFILE_TABS = [
  "Pregnancy context",
  "Notifications",
  "Privacy",
  "Trusted contact",
  "Account",
] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];

export const CONTEXT_FIELDS = [
  { label: "Due date", value: "14 November 2026" },
  { label: "Current stage", value: "32 weeks, third trimester" },
  { label: "Care location", value: "Lagoon Antenatal Clinic" },
  { label: "Usual clinician", value: "Midwife Grace Okonkwo" },
];

export const ACCOUNT_FIELDS = [
  { label: "Full name", value: "Faith Adeyemi" },
  { label: "Email", value: "faith.adeyemi@email.com" },
  { label: "Phone", value: "+234 803 555 0142" },
  { label: "Member since", value: "12 August 2026" },
];

export const PRIVACY_ROWS = [
  { id: "v1", label: "Pregnancy context", sub: "Due date, stage, clinic and clinician", on: true },
  { id: "v2", label: "Messages you send Nnneva", sub: "Used to build your plans, never to train models", on: true },
  { id: "v3", label: "Appointment notes and questions", sub: "Kept so the next visit starts prepared", on: true },
  { id: "v4", label: "Location for travel estimates", sub: "Only the clinic address, never live location", on: true },
  { id: "v5", label: "Symptoms you mention", sub: "Used by the safety layer to spot red flags", on: true },
];

export const RETENTION = ["3 months", "12 months", "Until I delete it"];

export const PERMISSIONS = [
  { id: "c1", label: "Can see tasks I share", sub: "Only the individual tasks you send", on: true },
  { id: "c2", label: "Can see appointment dates", sub: "Date, time and location", on: false },
  { id: "c3", label: "Gets reminders I forward", sub: "Each one still needs your approval", on: true },
  { id: "c4", label: "Can see test results", sub: "Off by default", on: false },
];

export const NOTIF_PREFS = [
  { id: "n1", label: "Approvals needed", on: true },
  { id: "n2", label: "Deadlines within 24 hours", on: true },
  { id: "n3", label: "Daily summary", on: false },
  { id: "n4", label: "Safety alerts", on: true },
];
