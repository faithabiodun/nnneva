/**
 * The red-flag test suite.
 *
 * The build spec's day-5 milestone is "every case in the red-flag test suite
 * escalates correctly". This is that suite for the frontend's triage mirror;
 * the Python implementation carries the equivalent one and is the source of
 * truth.
 *
 * The rule these cases exist to protect: this layer fails TOWARDS escalation.
 * A false escalation costs a health worker two minutes. A missed report costs
 * more than that.
 */

import { describe, expect, it } from "vitest";

import { triage } from "./triage";

describe("danger signs escalate", () => {
  it("escalates vaginal bleeding at any gestational week", () => {
    expect(triage("I am bleeding and it will not stop", 33).band).toBe("emergency");
    expect(triage("I am bleeding", 9).band).toBe("emergency");
  });

  it("escalates severe headache with visual disturbance", () => {
    const result = triage("I have a severe headache and blurred vision", 30);
    expect(result.band).toBe("emergency");
    expect(result.sign?.id).toBe("severe-headache-vision");
  });

  it("escalates reduced fetal movement across the phrasings a mother actually uses", () => {
    // "baby moving less" is not a substring of "baby IS moving less" — this
    // case is here because that exact gap shipped once.
    for (const message of [
      "The baby is moving less than yesterday",
      "baby has not moved since morning",
      "the baby is not moving",
      "she is kicking less today",
      "I have not felt the baby all day",
    ]) {
      expect(triage(message, 33).sign?.id, message).toBe("reduced-fetal-movement");
    }
  });

  it("escalates swelling of the face and hands", () => {
    expect(triage("my hands are swollen", 33).band).toBe("urgent");
  });
});

describe("gestational windows", () => {
  it("does not escalate reduced fetal movement before week 28", () => {
    // Escalating this at 12 weeks would train her to ignore it at 34.
    expect(triage("The baby is moving less than yesterday", 12).band).toBe("routine");
    expect(triage("The baby is moving less than yesterday", 33).band).toBe("urgent");
  });

  it("does not escalate swelling or headache in the first trimester", () => {
    expect(triage("my hands are swollen", 10).band).toBe("routine");
    expect(triage("I have a severe headache and blurred vision", 8).band).toBe("routine");
  });

  it("records why an out-of-window sign did not fire", () => {
    const result = triage("The baby is moving less than yesterday", 12);
    const line = result.trace.find((t) => t.rule === "Reduced fetal movement");
    expect(line?.outcome).toBe("out-of-window");
  });
});

describe("negation and hypotheticals", () => {
  it("does not escalate a mother asking what to do if a sign appears", () => {
    const result = triage("What should I do if I start bleeding?", 33);
    expect(result.band).toBe("routine");
    expect(result.suppressed).toBe(true);
  });

  it("still escalates a second sign when the first is negated", () => {
    const result = triage("I have no bleeding but I have a fever", 33);
    expect(result.band).toBe("urgent");
    expect(result.sign?.id).toBe("fever");
  });

  it("escalates an uncertain report rather than reading it as a denial", () => {
    // "not sure if" contains a negation, but she is reporting, not denying.
    expect(triage("I am not sure if the baby is moving less", 33).band).toBe("urgent");
  });
});

describe("routine handling", () => {
  it("answers from the corpus when an entry covers the question", () => {
    const result = triage("I have heartburn most evenings now", 33);
    expect(result.band).toBe("routine");
    expect(result.entry?.id).toBe("heartburn");
  });

  it("saves the question rather than improvising when nothing covers it", () => {
    const result = triage("Can I travel to my mother's village next month?", 33);
    expect(result.band).toBe("routine");
    expect(result.entry).toBeNull();
  });
});

describe("failure behaviour", () => {
  it("returns the urgent band rather than routine when triage itself fails", () => {
    // A non-string reaches .toLowerCase() and throws inside the try block.
    const result = triage(undefined as unknown as string, 33);
    expect(result.band).toBe("urgent");
  });

  it("takes the highest band when a message trips more than one sign", () => {
    const result = triage("I have a fever and I am bleeding", 33);
    expect(result.band).toBe("emergency");
  });
});
