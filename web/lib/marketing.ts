/**
 * Copy for the marketing page, kept out of the components so the wording can be
 * revised without touching layout. Every string here is from the design.
 */

export const AGENT_STEPS = [
  {
    label: "Remembers your context",
    title: "Remembers your context",
    body: "You explained your due date and your clinic once, at setup. Nnneva never asks again.",
    kind: "chips" as const,
    chips: [
      "Due 14 November",
      "32 weeks, third trimester",
      "Lagoon Antenatal Clinic",
      "Midwife Grace Okonkwo",
    ],
  },
  {
    label: "Checks it for risk first",
    title: "Checks it for risk first",
    body: "Before anything is created, the message is screened. If it looks urgent, automation stops instead of starting.",
    kind: "checks" as const,
    checks: ["No urgent symptoms in this request", "Normal automation allowed"],
  },
  {
    label: "Writes the plan",
    title: "Writes the plan",
    body: "One sentence becomes an ordered set of steps with an owner and a deadline for each.",
    kind: "plan" as const,
    plan: [
      { text: "Prepare questions for Thursday", meta: "Nnneva" },
      { text: "Book the third-trimester blood test", meta: "Faith" },
      { text: "Fast from 21:00 the night before", meta: "Reminder" },
      { text: "Arrange transport for 08:45", meta: "Reminder" },
    ],
  },
  {
    label: "Does the small work",
    title: "Does the small work",
    body: "Tasks, reminders and the question list for the midwife are created and dated, not suggested.",
    kind: "counts" as const,
    counts: [
      { n: "4", label: "tasks created with due dates" },
      { n: "3", label: "reminders scheduled" },
      { n: "6", label: "questions saved for the visit" },
      { n: "0", label: "things left for you to remember" },
    ],
  },
  {
    label: "Stops where it should",
    title: "Stops where it should",
    body: "Anything that leaves your account waits for a yes. Every time, not just the first.",
    kind: "approval" as const,
    approval: {
      eyebrow: "Needs your approval",
      question: "Send the blood test reminder to Chidi as well?",
      accept: "Allow once",
      decline: "Not now",
    },
  },
  {
    label: "Keeps watching after",
    title: "Keeps watching after",
    body: "What was learned goes to memory, and unfinished work comes back to you at the right moment.",
    kind: "memory" as const,
    memory: [
      "Blood test due before week 34",
      "Fasting required",
      "Transport takes 40 minutes",
    ],
  },
];

export const HOW_IT_WORKS = [
  {
    title: "Tell Nnneva the goal",
    body: "One message in plain language. No forms, no categories, no tagging.",
  },
  {
    title: "It plans and acts",
    body: "Nnneva reads your stored context, checks safety, then creates the tasks, reminders and preparation itself.",
  },
  {
    title: "You approve and move on",
    body: "Anything with real consequences waits for your confirmation. Everything else is already done.",
  },
];

export const GUARDRAILS = [
  "No diagnosis, and no naming a condition as a conclusion",
  "No prescriptions and no changes to medication",
  "Automation stops when a message looks like a red flag",
  "Nothing leaves your account without your approval",
];
