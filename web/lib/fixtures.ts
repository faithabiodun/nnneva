/**
 * Seeded synthetic cohort.
 *
 * No real patient data appears anywhere in this project. Every name below is
 * fictional and every record is generated from a fixed seed, which also means
 * the console renders identically on every run — the demo cannot drift between
 * takes, and it still renders if a live model call fails.
 *
 * Clock is pinned to DEMO_NOW (Tuesday 8 September 2026), just after the 06:00
 * sweep.
 */

import { DEMO_NOW, buildSchedule } from "./schedule";
import type { AuditEntry, ChatMessage, Mother, QueueItem, SavedQuestion } from "./types";

/* -------------------------------------------------------------------------- */
/* Deterministic PRNG                                                          */
/* -------------------------------------------------------------------------- */

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  "Adaeze", "Aisha", "Bisi", "Chinelo", "Damilola", "Ebele", "Folake", "Grace",
  "Hauwa", "Ifeoma", "Jumoke", "Kemi", "Ladi", "Maryam", "Nkiru", "Omolara",
  "Patience", "Rukayat", "Sade", "Temitope", "Uche", "Victoria", "Yetunde",
  "Zara", "Abike", "Binta", "Chidinma", "Dorcas", "Esosa", "Fatimah", "Gloria",
  "Hadiza", "Ijeoma", "Kaosarat", "Lami", "Morayo",
];

const SURNAMES = [
  "Abiola", "Balogun", "Chukwu", "Danjuma", "Emeka", "Fashola", "Garba",
  "Ibrahim", "Jibril", "Kalu", "Lawal", "Mohammed", "Nwosu", "Obi", "Popoola",
  "Salami", "Tijani", "Udoh", "Williams", "Yakubu",
];

const VILLAGES = [
  "Ikotun", "Agbado", "Odogunyan", "Ijoko", "Sango", "Ifo", "Owode",
  "Ota", "Atan", "Ilaro",
];

const RELATIONSHIPS = ["husband", "mother", "sister", "aunt", "neighbour"];

/* -------------------------------------------------------------------------- */
/* Hand-authored mothers                                                       */
/* -------------------------------------------------------------------------- */

/**
 * These six carry the demo. Everything about them is specific because the
 * console is only convincing if the evidence is specific.
 */
const HERO_MOTHERS: Mother[] = [
  {
    id: "m-amina",
    name: "Amina Bello",
    age: 27,
    gestationalWeek: 34,
    dueDate: "2026-10-27",
    phone: "+234 803 000 0141",
    village: "Odogunyan",
    consent: true,
    emergencyContact: { name: "Sikiru Bello", relationship: "husband", phone: "+234 803 000 0142" },
    ancContacts: buildSchedule(34, [5]),
    lastInboundAt: "2026-08-28T14:22:00.000Z",
    enrolledAt: "2026-03-02T09:00:00.000Z",
  },
  {
    id: "m-ngozi",
    name: "Ngozi Okafor",
    age: 31,
    gestationalWeek: 31,
    dueDate: "2026-11-17",
    phone: "+234 806 000 0233",
    village: "Sango",
    consent: true,
    emergencyContact: { name: "Chidi Okafor", relationship: "husband", phone: "+234 806 000 0234" },
    ancContacts: buildSchedule(31),
    lastInboundAt: "2026-09-07T19:41:00.000Z",
    enrolledAt: "2026-04-11T10:30:00.000Z",
  },
  {
    id: "m-halima",
    name: "Halima Yusuf",
    age: 22,
    gestationalWeek: 22,
    dueDate: "2027-01-19",
    phone: "+234 810 000 0318",
    village: "Ifo",
    consent: true,
    emergencyContact: { name: "Rakiya Yusuf", relationship: "mother", phone: "+234 810 000 0319" },
    ancContacts: buildSchedule(22, [1, 2]),
    lastInboundAt: "2026-08-13T08:05:00.000Z",
    enrolledAt: "2026-06-01T11:15:00.000Z",
  },
  {
    id: "m-chiamaka",
    name: "Chiamaka Eze",
    age: 29,
    gestationalWeek: 38,
    dueDate: "2026-09-22",
    phone: "+234 802 000 0407",
    village: "Ilaro",
    consent: true,
    emergencyContact: { name: "Ngozi Eze", relationship: "sister", phone: "+234 802 000 0408" },
    ancContacts: buildSchedule(38),
    lastInboundAt: "2026-09-01T16:50:00.000Z",
    enrolledAt: "2026-01-19T08:45:00.000Z",
  },
  {
    id: "m-fatima",
    name: "Fatima Sani",
    age: 24,
    gestationalWeek: 19,
    dueDate: "2027-02-02",
    phone: "+234 807 000 0512",
    village: "Atan",
    consent: true,
    emergencyContact: { name: "Musa Sani", relationship: "husband", phone: "+234 807 000 0513" },
    ancContacts: buildSchedule(19),
    lastInboundAt: "2026-09-06T12:14:00.000Z",
    enrolledAt: "2026-05-22T14:00:00.000Z",
  },
  {
    id: "m-blessing",
    name: "Blessing Adeyemi",
    age: 20,
    gestationalWeek: 11,
    dueDate: "2027-03-30",
    phone: "+234 805 000 0619",
    village: "Owode",
    consent: true,
    emergencyContact: { name: "Titi Adeyemi", relationship: "mother", phone: "+234 805 000 0620" },
    ancContacts: buildSchedule(11),
    lastInboundAt: null,
    enrolledAt: "2026-08-18T10:00:00.000Z",
  },
];

/** The mother whose phone the chat surface represents. */
export const DEMO_MOTHER_ID = "m-zainab";

const DEMO_MOTHER: Mother = {
  id: DEMO_MOTHER_ID,
  name: "Zainab Musa",
  age: 26,
  gestationalWeek: 33,
  dueDate: "2026-11-03",
  phone: "+234 809 000 0755",
  village: "Ijoko",
  consent: true,
  emergencyContact: { name: "Halima Musa", relationship: "sister", phone: "+234 809 000 0756" },
  ancContacts: buildSchedule(33),
  lastInboundAt: "2026-09-08T06:58:00.000Z",
  enrolledAt: "2026-03-28T09:20:00.000Z",
};

/* -------------------------------------------------------------------------- */
/* Generated cohort                                                            */
/* -------------------------------------------------------------------------- */

const COHORT_SIZE = 42;

function generateCohort(): Mother[] {
  const rand = mulberry32(20260908);
  const hand = [...HERO_MOTHERS, DEMO_MOTHER];
  const generated: Mother[] = [];

  for (let i = 0; generated.length < COHORT_SIZE - hand.length; i++) {
    const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
    const last = SURNAMES[Math.floor(rand() * SURNAMES.length)];
    const week = 8 + Math.floor(rand() * 31);
    const daysSinceContact = Math.floor(rand() * 9);
    const hasWritten = rand() > 0.18;

    // Two mothers in the cohort have not consented. They are enrolled and
    // counted, but the sweep must skip them entirely.
    const consent = i !== 4 && i !== 21;

    const dueDate = new Date(DEMO_NOW.getTime() + (40 - week) * 7 * 86_400_000);

    generated.push({
      id: `m-${String(i + 1).padStart(3, "0")}`,
      name: `${first} ${last}`,
      age: 19 + Math.floor(rand() * 18),
      gestationalWeek: week,
      dueDate: dueDate.toISOString().slice(0, 10),
      phone: `+234 8${Math.floor(rand() * 10)}${Math.floor(rand() * 10)} 000 ${String(1000 + i)}`,
      village: VILLAGES[Math.floor(rand() * VILLAGES.length)],
      consent,
      emergencyContact: {
        name: `${FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]} ${last}`,
        relationship: RELATIONSHIPS[Math.floor(rand() * RELATIONSHIPS.length)],
        phone: `+234 8${Math.floor(rand() * 10)}${Math.floor(rand() * 10)} 000 ${String(2000 + i)}`,
      },
      ancContacts: buildSchedule(week),
      lastInboundAt: hasWritten
        ? new Date(DEMO_NOW.getTime() - daysSinceContact * 86_400_000).toISOString()
        : null,
      enrolledAt: new Date(DEMO_NOW.getTime() - (30 + Math.floor(rand() * 150)) * 86_400_000).toISOString(),
    });
  }

  return [...hand, ...generated];
}

export const COHORT: Mother[] = generateCohort();

export function motherById(id: string): Mother | undefined {
  return COHORT.find((m) => m.id === id);
}

/* -------------------------------------------------------------------------- */
/* The queue the 06:00 sweep produced                                          */
/* -------------------------------------------------------------------------- */

export const SWEEP_RAN_AT = "2026-09-08T06:00:00.000Z";

/**
 * Ranked. Amina is first because two independent signals agree and nobody has
 * spoken to her since either of them.
 */
export const SEED_QUEUE: QueueItem[] = [
  {
    id: "q-001",
    motherId: "m-amina",
    band: "urgent",
    reason:
      "Missed her contact-5 window by nine days and last messaged eleven days ago about swelling in her hands — two independent signals, no contact since.",
    evidence: [
      {
        kind: "schedule",
        label: "Contact 5 missed",
        detail: "Target was week 34. She is now 9 days past the window with no visit recorded.",
      },
      {
        kind: "message",
        label: "Swelling in hands reported",
        detail:
          "“My hands have been swelling, especially in the morning.” Triaged urgent at the time and an escalation was sent.",
        at: "2026-08-28T14:22:00.000Z",
      },
      {
        kind: "silence",
        label: "No contact for 11 days",
        detail: "No inbound message and no recorded visit since 28 August.",
      },
    ],
    createdAt: SWEEP_RAN_AT,
    source: "sweep",
    status: "open",
  },
  {
    id: "q-002",
    motherId: "m-ngozi",
    band: "urgent",
    reason:
      "Reported reduced fetal movement at 31 weeks yesterday evening. Escalation was sent automatically; no human has spoken to her yet.",
    evidence: [
      {
        kind: "triage",
        label: "Danger sign matched: reduced fetal movement",
        detail: "In window (applies from week 28; she is at week 31). Urgent band, escalation text sent.",
        at: "2026-09-07T19:41:00.000Z",
      },
      {
        kind: "message",
        label: "Her message",
        detail: "“The baby is moving less than yesterday, is that normal at this stage?”",
        at: "2026-09-07T19:41:00.000Z",
      },
      {
        kind: "silence",
        label: "No reply since escalation",
        detail: "She has not written again since being told to attend today.",
      },
    ],
    createdAt: "2026-09-07T19:41:12.000Z",
    source: "triage",
    status: "open",
  },
  {
    id: "q-003",
    motherId: "m-halima",
    band: "urgent",
    reason:
      "First two antenatal contacts both missed and she has not been in touch for 26 days. She is 22 weeks and has never completed a contact.",
    evidence: [
      {
        kind: "schedule",
        label: "Contacts 1 and 2 both missed",
        detail: "Targets were weeks 12 and 20. Neither was completed. No contacts recorded at all.",
      },
      {
        kind: "silence",
        label: "No contact for 26 days",
        detail: "Last inbound message 13 August, shortly after enrolment.",
      },
    ],
    createdAt: SWEEP_RAN_AT,
    source: "sweep",
    status: "open",
  },
  {
    id: "q-004",
    motherId: "m-chiamaka",
    band: "urgent",
    reason:
      "38 weeks and her contact is due today. She said last week she had no transport money, and she lives furthest from the facility.",
    evidence: [
      {
        kind: "schedule",
        label: "Contact 7 due today",
        detail: "Target week 38. She reached week 38 this week.",
      },
      {
        kind: "message",
        label: "Transport barrier reported",
        detail: "“I am not sure I can reach the centre this month, the fare has gone up.”",
        at: "2026-09-01T16:50:00.000Z",
      },
      {
        kind: "flag",
        label: "Furthest in cohort",
        detail: "Ilaro — the longest journey to the facility of any enrolled mother.",
      },
    ],
    createdAt: SWEEP_RAN_AT,
    source: "sweep",
    status: "open",
  },
  {
    id: "q-005",
    motherId: "m-fatima",
    band: "routine",
    reason:
      "Three questions saved during the week that the corpus did not cover. Her contact-2 visit is in four days — worth five minutes of preparation.",
    evidence: [
      {
        kind: "flag",
        label: "3 saved questions",
        detail: "Accumulated 2-6 September. None were answered by the agent.",
      },
      {
        kind: "schedule",
        label: "Contact 2 in 4 days",
        detail: "Target week 20. She is at week 19.",
      },
    ],
    createdAt: SWEEP_RAN_AT,
    source: "sweep",
    status: "open",
  },
  {
    id: "q-006",
    motherId: "m-blessing",
    band: "routine",
    reason:
      "Enrolled three weeks ago and has never sent a message. Her first contact window opens next week and she has had no orientation.",
    evidence: [
      {
        kind: "silence",
        label: "Never made contact",
        detail: "Enrolled 18 August. No inbound message at any point.",
      },
      {
        kind: "schedule",
        label: "Contact 1 opens next week",
        detail: "Target week 12. She is at week 11.",
      },
    ],
    createdAt: SWEEP_RAN_AT,
    source: "sweep",
    status: "open",
  },
];

/* -------------------------------------------------------------------------- */
/* Audit log                                                                   */
/* -------------------------------------------------------------------------- */

export const SEED_AUDIT: AuditEntry[] = [
  {
    id: "a-006",
    at: SWEEP_RAN_AT,
    kind: "sweep",
    actor: "agent",
    summary: "Cohort sweep completed — 40 of 42 mothers reviewed, 6 queued for review.",
    detail:
      "2 mothers excluded: consent not given. Sweep agent tool set: get_cohort, compute_anc_position, get_mother_history. No messaging tool available to this agent.",
  },
  {
    id: "a-005",
    at: "2026-09-07T19:41:12.000Z",
    kind: "escalation",
    actor: "agent",
    band: "urgent",
    summary: "Ngozi Okafor — reduced fetal movement matched, urgent escalation sent.",
    detail:
      "Deterministic triage matched before any model call. Escalation text assembled from corpus entry who-anc-2016, not generated. Queue item q-002 created in the same request.",
  },
  {
    id: "a-004",
    at: "2026-09-06T11:03:00.000Z",
    kind: "blocked",
    actor: "guardrail",
    band: "routine",
    summary: "Response blocked — named a condition as a conclusion.",
    detail:
      "after_model_call intervention caught “this sounds like it is probably gestational diabetes”. Returned Guide; regenerated response passed and cited corpus entry nutrition.",
  },
  {
    id: "a-003",
    at: "2026-09-05T09:12:00.000Z",
    kind: "action",
    actor: "chw",
    summary: "Grace Adeniyi confirmed: send follow-up message to Fatima Sani.",
    detail: "Tool send_message paused at before_tool_call. Confirmed by named health worker at 09:12.",
  },
  {
    id: "a-002",
    at: "2026-08-28T14:22:31.000Z",
    kind: "escalation",
    actor: "agent",
    band: "urgent",
    summary: "Amina Bello — swelling of face and hands matched, urgent escalation sent.",
    detail: "In window (applies from week 20; she was at week 32). Escalation assembled from corpus.",
  },
  {
    id: "a-001",
    at: "2026-08-27T06:00:00.000Z",
    kind: "sweep",
    actor: "agent",
    summary: "Cohort sweep completed — 38 of 40 mothers reviewed, 4 queued for review.",
  },
];

/* -------------------------------------------------------------------------- */
/* The demo mother's conversation                                              */
/* -------------------------------------------------------------------------- */

export const SEED_CHAT: ChatMessage[] = [
  {
    id: "c-001",
    role: "nnneva",
    text:
      "Good morning Zainab. You are at 33 weeks this week. Your next antenatal contact is contact 5, due in about a week — I will remind you nearer the time. How are you feeling today?",
    at: "2026-09-08T06:55:00.000Z",
  },
  {
    id: "c-002",
    role: "mother",
    text: "I am well, just very tired this week",
    at: "2026-09-08T06:58:00.000Z",
    band: "routine",
  },
  {
    id: "c-003",
    role: "nnneva",
    text:
      "Tiredness is expected in pregnancy, most of all in the first and last months. Rest when you can, and try not to measure yourself against how much you could do before. If the tiredness came on suddenly or you feel breathless with it, tell me — I will treat that differently.",
    at: "2026-09-08T06:58:20.000Z",
    band: "routine",
    source: {
      id: "fatigue",
      title: "Tiredness",
      citation: "World Health Organization, 2016",
    },
  },
];

export const SEED_SAVED_QUESTIONS: SavedQuestion[] = [
  {
    id: "sq-001",
    motherId: "m-fatima",
    text: "Is it safe to keep taking the herbal mixture my aunt gave me alongside the iron tablets?",
    at: "2026-09-02T10:20:00.000Z",
    answered: false,
  },
  {
    id: "sq-002",
    motherId: "m-fatima",
    text: "How much will the delivery cost at the centre?",
    at: "2026-09-04T18:02:00.000Z",
    answered: false,
  },
  {
    id: "sq-003",
    motherId: "m-fatima",
    text: "My sister says I should not sleep on my back. Is that true?",
    at: "2026-09-06T12:14:00.000Z",
    answered: false,
  },
  {
    id: "sq-004",
    motherId: DEMO_MOTHER_ID,
    text: "Can I travel to my mother's village at 35 weeks?",
    at: "2026-09-03T15:40:00.000Z",
    answered: false,
  },
];

/** Header numbers for the console. Derived, so they cannot drift from the data. */
export const COHORT_STATS = {
  enrolled: COHORT.length,
  reviewed: COHORT.filter((m) => m.consent).length,
  excluded: COHORT.filter((m) => !m.consent).length,
};
