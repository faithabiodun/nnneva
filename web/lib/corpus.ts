/**
 * The curated clinical corpus, as reviewable data.
 *
 * SOURCE: WHO recommendations on antenatal care for a positive pregnancy
 * experience (WHO, 2016); WHO Pregnancy, Childbirth, Postpartum and Newborn
 * Care: a guide for essential practice, 3rd ed. (WHO, 2015); Federal Ministry
 * of Health Nigeria, National Guidelines for Antenatal Care.
 *
 * REQUIRES CLINICIAN REVIEW BEFORE ANY REAL DEPLOYMENT. This header is not a
 * disclaimer — it states how this file is meant to be maintained. Every entry
 * here is intended to be read and signed off by a practising midwife or
 * clinician, and the file is versioned so that review is auditable.
 *
 * In the shipped system this lives as JSON alongside the Python agent. It is
 * duplicated here in TypeScript so the frontend demo runs with no backend.
 * The Python triage function is the source of truth.
 */

import type { CorpusSource, TriageBand } from "./types";

export interface DangerSign {
  id: string;
  /** Human label used in the queue and the audit log. */
  label: string;
  /** Lowercase substrings. Matching is deliberately dumb and auditable. */
  triggers: string[];
  band: Exclude<TriageBand, "routine">;
  /**
   * Gestational window in which the sign applies, inclusive.
   * Reduced fetal movement is meaningless at 8 weeks and critical at 34; a
   * system that escalates the former trains the mother to ignore the latter.
   */
  minWeek: number;
  maxWeek: number;
  /** Assembled, never generated. This is the highest-stakes text Nnneva says. */
  escalation: string;
  source: CorpusSource;
}

const WHO_2016: CorpusSource = {
  id: "who-anc-2016",
  title: "Recommendations on antenatal care for a positive pregnancy experience",
  citation: "World Health Organization, 2016",
};

const WHO_PCPNC: CorpusSource = {
  id: "who-pcpnc-2015",
  title: "Pregnancy, Childbirth, Postpartum and Newborn Care: a guide for essential practice",
  citation: "World Health Organization, 3rd edition, 2015",
};

const FMOH_NG: CorpusSource = {
  id: "fmoh-ng-anc",
  title: "National Guidelines for Antenatal Care",
  citation: "Federal Ministry of Health, Nigeria",
};

/**
 * Escalation text is composed from two fixed halves: what to do, and who to
 * contact. Neither half is ever written by a model.
 */
const GO_NOW =
  "This needs a health worker right now. Please go to your health facility immediately, or call your emergency contact to take you. Do not wait to see if it improves.";

const GO_TODAY =
  "This needs a health worker today. Please contact your health facility or your community health worker today rather than waiting for your next appointment.";

export const DANGER_SIGNS: DangerSign[] = [
  {
    id: "vaginal-bleeding",
    label: "Vaginal bleeding",
    triggers: ["bleeding", "blood coming", "spotting blood", "i am bleeding", "bleed"],
    band: "emergency",
    minWeek: 0,
    maxWeek: 42,
    escalation: GO_NOW,
    source: WHO_PCPNC,
  },
  {
    id: "convulsions",
    label: "Convulsions or fits",
    triggers: ["convulsion", "seizure", "fits", "shaking uncontrollably", "jerking"],
    band: "emergency",
    minWeek: 0,
    maxWeek: 42,
    escalation: GO_NOW,
    source: WHO_PCPNC,
  },
  {
    id: "severe-headache-vision",
    label: "Severe headache with visual disturbance",
    triggers: [
      "severe headache",
      "bad headache",
      "headache and blurred",
      "blurred vision",
      "blurry vision",
      "seeing spots",
      "flashing lights",
      "cannot see well",
    ],
    band: "emergency",
    minWeek: 20,
    maxWeek: 42,
    escalation: GO_NOW,
    source: WHO_PCPNC,
  },
  {
    id: "difficulty-breathing",
    label: "Difficulty breathing",
    triggers: ["difficulty breathing", "cannot breathe", "can't breathe", "short of breath", "breathless"],
    band: "emergency",
    minWeek: 0,
    maxWeek: 42,
    escalation: GO_NOW,
    source: WHO_PCPNC,
  },
  {
    id: "severe-abdominal-pain",
    label: "Severe abdominal pain",
    triggers: ["severe pain", "severe stomach", "severe abdominal", "terrible pain", "unbearable pain"],
    band: "emergency",
    minWeek: 0,
    maxWeek: 42,
    escalation: GO_NOW,
    source: WHO_PCPNC,
  },
  {
    id: "fluid-leaking",
    label: "Fluid leaking before term",
    triggers: ["water broke", "water breaking", "fluid leaking", "leaking water", "waters have broken"],
    band: "emergency",
    minWeek: 0,
    maxWeek: 36,
    escalation: GO_NOW,
    source: WHO_PCPNC,
  },
  {
    id: "reduced-fetal-movement",
    label: "Reduced fetal movement",
    // Substring matching is unforgiving: "baby moving less" does not match
    // "baby IS moving less". Triggers are therefore kept short and anchored on
    // the phrase that actually varies least. Every phrasing a mother might
    // plausibly use has to be enumerated here, and this list is a standing item
    // for clinician review.
    triggers: [
      "moving less",
      "moves less",
      "moving very little",
      "barely moving",
      "not moving",
      "has not moved",
      "hasn't moved",
      "not felt the baby",
      "not feeling the baby",
      "less movement",
      "reduced movement",
      "no movement",
      "fewer kicks",
      "kicking less",
      "not kicking",
    ],
    band: "urgent",
    minWeek: 28,
    maxWeek: 42,
    escalation: GO_TODAY,
    source: WHO_2016,
  },
  {
    id: "fever",
    label: "Fever",
    triggers: ["fever", "high temperature", "hot body", "chills and fever"],
    band: "urgent",
    minWeek: 0,
    maxWeek: 42,
    escalation: GO_TODAY,
    source: WHO_PCPNC,
  },
  {
    id: "swelling-face-hands",
    label: "Swelling of face and hands",
    triggers: [
      "swollen face",
      "swelling in my face",
      "swollen hands",
      "swelling in my hands",
      "hands are swollen",
      "face is swollen",
      "puffy face",
    ],
    band: "urgent",
    minWeek: 20,
    maxWeek: 42,
    escalation: GO_TODAY,
    source: WHO_PCPNC,
  },
  {
    id: "persistent-vomiting",
    label: "Persistent vomiting",
    triggers: ["cannot keep anything down", "vomiting everything", "vomiting constantly", "keep vomiting"],
    band: "urgent",
    minWeek: 0,
    maxWeek: 42,
    escalation: GO_TODAY,
    source: FMOH_NG,
  },
  {
    id: "painful-urination",
    label: "Painful urination",
    triggers: ["burning when i urinate", "painful urination", "pain when passing urine", "burning urine"],
    band: "urgent",
    minWeek: 0,
    maxWeek: 42,
    escalation: GO_TODAY,
    source: FMOH_NG,
  },
];

/**
 * Routine entries. The model may explain and organise inside these, but the
 * answer is grounded here and the source is shown to the mother.
 */
export interface CorpusEntry {
  id: string;
  label: string;
  triggers: string[];
  answer: string;
  source: CorpusSource;
}

export const ROUTINE_CORPUS: CorpusEntry[] = [
  {
    id: "nausea",
    label: "Nausea and morning sickness",
    triggers: ["nausea", "morning sickness", "feeling sick", "queasy", "vomit in the morning"],
    answer:
      "Nausea is very common in pregnancy, especially in the first months, and it usually eases as the pregnancy goes on. Eating small amounts more often, having something dry like biscuits or bread before getting up, and sipping fluids through the day tend to help. If you cannot keep any food or fluid down at all, that is different — tell me and I will get a health worker to you.",
    source: WHO_2016,
  },
  {
    id: "heartburn",
    label: "Heartburn",
    triggers: ["heartburn", "burning in my chest", "acid", "reflux"],
    answer:
      "Heartburn is common, particularly later in pregnancy when there is less room in your stomach. Smaller meals, avoiding lying down straight after eating, and propping yourself up a little at night usually help. If it is not settling, we can add it to the list for your next contact so your health worker can look at it properly.",
    source: WHO_2016,
  },
  {
    id: "back-pain",
    label: "Back pain",
    triggers: ["back pain", "my back hurts", "backache", "waist pain"],
    answer:
      "Back and waist pain is one of the most common things mothers report, especially from the middle of pregnancy onwards as your posture changes. Gentle movement, avoiding standing for long stretches, and supporting your back when you sit tend to help. If the pain is severe or comes in waves, tell me — that is a different thing and I will treat it differently.",
    source: WHO_2016,
  },
  {
    id: "constipation",
    label: "Constipation",
    triggers: ["constipation", "cannot pass stool", "constipated", "hard stool"],
    answer:
      "Constipation is common in pregnancy. More fluid, more fibre in what you eat, and gentle daily movement are the usual first things to try. Do not take any laxative without asking your health worker first.",
    source: WHO_2016,
  },
  {
    id: "leg-cramps",
    label: "Leg cramps",
    triggers: ["leg cramp", "cramp in my leg", "legs cramping", "calf cramp"],
    answer:
      "Leg cramps, particularly at night, are common in pregnancy and are not usually a sign that something is wrong. Stretching the calf before bed and staying well hydrated tend to help. If one leg is swollen, red, or painful to touch rather than cramping, tell me straight away — that is different.",
    source: WHO_2016,
  },
  {
    id: "fatigue",
    label: "Tiredness",
    triggers: ["tired", "exhausted", "no energy", "always sleeping", "fatigue"],
    answer:
      "Tiredness is expected in pregnancy, most of all in the first and last months. Rest when you can, and try not to measure yourself against how much you could do before. If the tiredness came on suddenly or you feel breathless with it, tell me — I will treat that differently.",
    source: WHO_2016,
  },
  {
    id: "iron-supplements",
    label: "Iron and folic acid",
    triggers: ["iron tablet", "folic acid", "supplement", "my tablets", "iron"],
    answer:
      "Daily iron and folic acid supplements are recommended through pregnancy to prevent anaemia. Take them as your health worker directed. They can make some mothers feel a little nauseous or change the colour of your stool, which is expected. I cannot change a dose or tell you to stop — only your health worker can do that.",
    source: WHO_2016,
  },
  {
    id: "nutrition",
    label: "Eating in pregnancy",
    triggers: ["what should i eat", "food", "diet", "nutrition", "eating"],
    answer:
      "A varied diet through pregnancy matters more than any single food: staples, beans or other protein, vegetables and fruit where you can get them. Alongside that, your iron and folic acid supplements do work that food alone does not. If money or availability is the problem rather than knowing what to eat, say so and I will note it for your health worker.",
    source: WHO_2016,
  },
  {
    id: "exercise",
    label: "Activity and exercise",
    triggers: ["exercise", "can i walk", "is it safe to work", "physical activity", "lifting"],
    answer:
      "Staying gently active through pregnancy is generally recommended and helps with back pain and sleep. Walking is a reasonable default. Heavy lifting and anything with a risk of falling are worth avoiding. If your pregnancy has any complication your health worker has told you about, follow what she said over this.",
    source: WHO_2016,
  },
  {
    id: "anc-schedule",
    label: "Antenatal visits",
    triggers: ["next appointment", "when is my visit", "anc", "antenatal", "my next contact", "checkup"],
    answer:
      "The recommended schedule is eight antenatal contacts through pregnancy. I track where you are in that schedule and I will remind you before each one. I can also tell your health worker if you are going to have trouble getting to a visit.",
    source: WHO_2016,
  },
];

export const ESCALATION_TEXT = { GO_NOW, GO_TODAY };
