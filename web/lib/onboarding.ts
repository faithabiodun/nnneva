/**
 * The five onboarding questions.
 *
 * Each step carries its own "why" note, which the design pins beside the
 * question on a sticky note. That note is the whole reason the flow feels
 * unlike a signup form: every question says what it will be used for before it
 * asks, which is also what §02 of the blueprint requires — ask only for what is
 * genuinely needed.
 */

export type StepKind = "date" | "choice" | "multi" | "place" | "contact";

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
}

export const STEPS: Step[] = [
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
    options: [
      { label: "Evenings, after 18:00", sub: "Most people choose this" },
      { label: "Mornings, from 08:00" },
      { label: "Any time is fine" },
    ],
  },
];

/**
 * The help areas, taken from the step that asks for them rather than repeated.
 * The profile screen offers the same set, and a second hand-written list would
 * drift — a label edited in one place would silently stop matching what is
 * already stored against accounts set up through the other.
 */
export const HELP_AREAS: string[] =
  STEPS.find((s) => s.kind === "multi")?.options?.map((o) => o.label) ?? [];
