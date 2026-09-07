/**
 * The five onboarding questions.
 *
 * Each step carries its own "why" note, which the design pins beside the
 * question on a sticky note. That note is the whole reason the flow feels
 * unlike a signup form: every question says what it will be used for before it
 * asks, which is also what §02 of the blueprint requires — ask only for what is
 * genuinely needed.
 */

export type StepKind =
  | "date"
  | "birthdate"
  | "choice"
  | "multi"
  | "place"
  | "contact"
  | "supporting";

export interface Step {
  kind: StepKind;
  eyebrow: string;
  question: string;
  help: string;
  why: string;
  noteBg: string;
  noteFg: string;
  skip?: string;
  options?: { label: string; sub?: string }[];
  /**
   * For a "choice" step, which answer it writes.
   *
   * Its absence is what marks the contact-window step: that one is a clock and
   * an "any time" toggle rather than a list, so it has options to render but
   * no single answer field to bind to.
   */
  field?: "feeding" | "contactRelationship";
}

/** Someone expecting. The original five. */
export const EXPECTING_STEPS: Step[] = [
  {
    kind: "date",
    eyebrow: "Step one",
    question: "When is your baby due?",
    help: "This anchors everything else — which week you are in, what is coming up, and when a test or visit is getting late.",
    why: "Nnneva asks once, and then never again. Every reminder, every deadline and every piece of preparation is worked out from this one date.",
    noteBg: "#FDF1F5",
    noteFg: "#0B2C22",
    skip: "I am not sure of my due date",
  },
  {
    kind: "place",
    eyebrow: "Step two",
    question: "Where will you have your care?",
    help: "So appointments, travel time and preparation are planned around the right place.",
    why: "Knowing the clinic means Nnneva can judge how long the journey takes and remind you to leave in time, rather than reminding you when you are already late.",
    noteBg: "#E4F1EB",
    noteFg: "#0B2C22",
    skip: "I will decide later",
    options: [
      { label: "An antenatal clinic", sub: "Standalone or attached to a hospital" },
      { label: "A hospital", sub: "Public or private" },
      { label: "A private midwife", sub: "Home or clinic visits" },
      { label: "Not decided yet", sub: "Nnneva will help you choose" },
    ],
  },
  {
    kind: "multi",
    eyebrow: "Step three",
    question: "What should Nnneva take off your hands?",
    help: "Pick as many as you like. You can change this at any time.",
    why: "This decides what Nnneva does on its own and what it leaves alone. Anything you do not pick here, it will not go near.",
    noteBg: "#FDF1F5",
    noteFg: "#0B2C22",
    options: [
      { label: "Appointments and preparation", sub: "Questions for the midwife, what to bring" },
      { label: "Tests and results", sub: "Booking, fasting, chasing results" },
      { label: "Everyday errands", sub: "Prescriptions, transport, supplies" },
      { label: "Preparing for the birth", sub: "Hospital bag, plans, contacts" },
    ],
  },
  {
    kind: "contact",
    eyebrow: "Step four",
    question: "Is there someone helping you?",
    help: "A partner, a family member, a friend. Optional, and they only ever see what you switch on.",
    why: "Nothing about your pregnancy reaches a trusted contact unless you approve it, and Nnneva asks every single time — not once at setup.",
    noteBg: "#E4F1EB",
    noteFg: "#0B2C22",
    skip: "It is just me for now",
    options: [],
  },
  {
    kind: "choice",
    eyebrow: "Step five",
    question: "When should Nnneva reach you?",
    help: "Nnneva only gets in touch when something needs a decision or a deadline is close.",
    why: "Everything that is not urgent waits for the window you pick here. A reminder at a useless hour is one more thing to carry.",
    noteBg: "#FDF1F5",
    noteFg: "#0B2C22",
    // No options: this step is a clock plus an "any time" choice, so the answer
    // is a time rather than one of a fixed few. See ContactWindow.
  },
];

/** Someone who has given birth.
 *
 * Not the pregnancy flow with the due date swapped out. A due date is a
 * prediction and a birth date is a fact, the useful help is different, and
 * asking about trimesters after the event would be the clearest possible sign
 * that nobody thought about this person. */
export const POSTPARTUM_STEPS: Step[] = [
  {
    kind: "birthdate",
    eyebrow: "Step one",
    question: "When was your baby born?",
    help: "This anchors everything else — where you are in your recovery, and which checks are coming up.",
    why: "Nnneva asks once. Postnatal checks, vaccinations and reviews all fall at known points after the birth, so this one date is enough to keep track of them.",
    noteBg: "#FDF1F5",
    noteFg: "#0B2C22",
  },
  {
    kind: "choice",
    eyebrow: "Step two",
    question: "How is feeding going?",
    field: "feeding",
    help: "So advice and reminders match what you are actually doing.",
    why: "This changes what is worth reminding you about and what would be noise. It is never used to judge — there is no right answer here, and \u201cstill working it out\u201d is a real one.",
    noteBg: "#E4F1EB",
    noteFg: "#0B2C22",
    skip: "I would rather not say",
    options: [
      { label: "Breastfeeding", sub: "Exclusively or mostly" },
      { label: "Formula", sub: "Exclusively or mostly" },
      { label: "Both", sub: "Mixed feeding" },
      { label: "Still working it out", sub: "It is early days" },
    ],
  },
  {
    kind: "multi",
    eyebrow: "Step three",
    question: "What should Nnneva take off your hands?",
    help: "Pick as many as you like. You can change this at any time.",
    why: "This decides what Nnneva does on its own and what it leaves alone. Anything you do not pick here, it will not go near.",
    noteBg: "#FDF1F5",
    noteFg: "#0B2C22",
    options: [
      { label: "Your own recovery", sub: "Postnatal checks, bleeding, pain, mood" },
      { label: "The baby's appointments", sub: "Weigh-ins, vaccinations, reviews" },
      { label: "Feeding and sleep", sub: "Routines, night feeds, what to expect" },
      { label: "Everyday errands", sub: "Prescriptions, transport, supplies" },
    ],
  },
  {
    kind: "contact",
    eyebrow: "Step four",
    question: "Is there someone helping you?",
    help: "A partner, a family member, a friend. Optional, and they only ever see what you switch on.",
    why: "Nothing reaches a trusted contact unless you approve it, and Nnneva asks every single time — not once at setup.",
    noteBg: "#E4F1EB",
    noteFg: "#0B2C22",
    skip: "It is just me for now",
    options: [],
  },
  {
    kind: "choice",
    eyebrow: "Step five",
    question: "When should Nnneva reach you?",
    help: "Nnneva only gets in touch when something needs a decision or a deadline is close.",
    why: "Everything that is not urgent waits for the window you pick here. With a newborn, a reminder at the wrong hour is worse than no reminder at all.",
    noteBg: "#FDF1F5",
    noteFg: "#0B2C22",
  },
];

/** Someone supporting another person.
 *
 * Three questions, because there are only three things Nnneva needs from
 * them. They have no due date and no clinic — those belong to the person they
 * are helping, and asking here would be asking them to answer for someone
 * else. */
export const SUPPORTER_STEPS: Step[] = [
  {
    kind: "supporting",
    eyebrow: "Step one",
    question: "Who are you supporting?",
    help: "Their Nnneva username. They decide whether to accept, and what you can see.",
    why: "Nothing is shared by you asking. They get a request, and until they accept it and switch something on, you see nothing at all.",
    noteBg: "#FDF1F5",
    noteFg: "#0B2C22",
    skip: "They have not joined yet",
  },
  {
    kind: "choice",
    eyebrow: "Step two",
    question: "What are you to them?",
    field: "contactRelationship",
    help: "So they know who is asking when the request arrives.",
    why: "\u201cChidi wants to help as your partner\u201d is a clearer thing to accept than a name on its own.",
    noteBg: "#E4F1EB",
    noteFg: "#0B2C22",
    options: [
      { label: "Partner" },
      { label: "Husband" },
      { label: "Mother" },
      { label: "Mother-in-law" },
      { label: "Sister" },
      { label: "Friend" },
      { label: "Doula" },
      { label: "Other family" },
    ],
  },
  {
    kind: "choice",
    eyebrow: "Step three",
    question: "When should Nnneva reach you?",
    help: "Only when something has actually been asked of you.",
    why: "You will hear from Nnneva when they hand you something to do, and not otherwise.",
    noteBg: "#FDF1F5",
    noteFg: "#0B2C22",
  },
];

export type Role = "expecting" | "postpartum" | "supporter";

export function stepsFor(role: Role | null): Step[] {
  if (role === "postpartum") return POSTPARTUM_STEPS;
  if (role === "supporter") return SUPPORTER_STEPS;
  return EXPECTING_STEPS;
}

/**
 * The help areas, taken from the steps that ask for them rather than repeated.
 * The profile screen offers the same set, and a second hand-written list would
 * drift — a label edited in one place would silently stop matching what is
 * already stored against accounts set up through the other.
 *
 * Both flows contribute, because the profile screen has to be able to render
 * whichever set an account was actually onboarded with.
 */
export const HELP_AREAS: string[] = [
  ...(EXPECTING_STEPS.find((s) => s.kind === "multi")?.options?.map((o) => o.label) ?? []),
  ...(POSTPARTUM_STEPS.find((s) => s.kind === "multi")?.options?.map((o) => o.label) ?? []),
];

/** Kept so existing imports of the pregnancy flow keep meaning what they did. */
export const STEPS = EXPECTING_STEPS;
