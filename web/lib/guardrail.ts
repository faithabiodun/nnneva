/**
 * Output guardrail — the third safety layer, running after every model call.
 *
 * Mirrors InterventionHandler.after_model_call on the Python side. The model
 * may organise and educate. It may not conclude.
 *
 * A violation returns Guide(feedback) to force a regeneration, and the block is
 * written to the audit log whether or not the regeneration succeeds.
 */

export type ViolationKind =
  | "condition-named"
  | "probability-claim"
  | "dosing-instruction"
  | "false-reassurance";

export interface Violation {
  kind: ViolationKind;
  /** The exact span that tripped the rule, for the audit entry. */
  match: string;
  explanation: string;
}

interface Rule {
  kind: ViolationKind;
  pattern: RegExp;
  explanation: string;
}

const RULES: Rule[] = [
  {
    kind: "condition-named",
    // A condition name presented as a conclusion, rather than as something a
    // health worker will assess.
    pattern:
      /\b(?:this (?:sounds|looks) like|you (?:probably )?have|it is|it's|this is)\s+(?:probably\s+|likely\s+|definitely\s+)?(?:a case of\s+)?(pre-?eclampsia|gestational diabetes|anaemia|anemia|placenta praevia|placenta previa|an infection|a urinary tract infection|a uti|malaria)\b/i,
    explanation: "Named a condition as a conclusion rather than deferring to a health worker.",
  },
  {
    kind: "probability-claim",
    pattern:
      /\b(?:most likely|probably|there is a \d+\s*(?:%|percent) chance|chances are|i(?:'m| am) fairly (?:sure|certain)|unlikely to be anything)\b/i,
    explanation: "Made a probability claim about a clinical outcome.",
  },
  {
    kind: "dosing-instruction",
    pattern:
      /\b(?:take|swallow|use)\s+(?:\d+|one|two|three|a|another)\s+(?:more\s+)?(?:tablets?|pills?|doses?|mg\b|capsules?)|\b(?:double|increase|reduce|stop taking)\s+(?:your|the)\s+(?:dose|tablets?|medication)\b/i,
    explanation: "Gave or adjusted a dosing instruction.",
  },
  {
    kind: "false-reassurance",
    pattern:
      /\b(?:nothing to worry about|definitely nothing|it'?s (?:definitely )?fine|no need to (?:worry|see|go)|you don'?t need to see|perfectly (?:safe|normal|fine)|there'?s no danger)\b/i,
    explanation: "Reassured that a symptom is definitely nothing.",
  },
];

/** Returns the first violation found, or null if the text is clean. */
export function detectDiagnosticLanguage(text: string): Violation | null {
  for (const rule of RULES) {
    const found = rule.pattern.exec(text);
    if (found) {
      return { kind: rule.kind, match: found[0], explanation: rule.explanation };
    }
  }
  return null;
}

/** The feedback handed back to the model as Guide(). */
export const REWRITE_INSTRUCTION: Record<ViolationKind, string> = {
  "condition-named":
    "Do not name a condition or present one as a conclusion. Describe what was reported, say what usually helps if it is a routine matter, and defer anything else to the health worker.",
  "probability-claim":
    "Do not estimate likelihood. Remove any claim about how probable a cause or outcome is.",
  "dosing-instruction":
    "Do not give, change, or stop a dose. Say that only her health worker can change what she is taking.",
  "false-reassurance":
    "Do not state that a symptom is definitely nothing. You may say that something is common; you may not close off the possibility that it matters.",
};

export const VIOLATION_LABEL: Record<ViolationKind, string> = {
  "condition-named": "Condition named as a conclusion",
  "probability-claim": "Probability claim",
  "dosing-instruction": "Dosing instruction",
  "false-reassurance": "False reassurance",
};
