/**
 * The inbound path, end to end.
 *
 * These cover the claim the demo is built around: a danger sign sent by a
 * mother produces fixed escalation text AND a queue item for the health worker
 * in the same pass, with an audit entry — not one or the other, and not later.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { DEMO_MOTHER_ID } from "./fixtures";
import {
  confirmAction,
  getDemoState,
  resetDemo,
  sendMotherMessage,
  tripGuardrail,
} from "./store";

// The actions are plain functions over module state, so these exercise the real
// store without mounting React.
const getQueue = () => getDemoState().queue;
const getAudit = () => getDemoState().audit;
const getChat = () => getDemoState().chat;
const getSavedQuestions = () => getDemoState().savedQuestions;

describe("the inbound message path", () => {
  beforeEach(() => {
    resetDemo();
  });

  it("raises a queue item and an audit entry for a danger sign, in the same pass", () => {
    const before = getQueue().length;
    const result = sendMotherMessage("The baby is moving less than yesterday");

    expect(result.band).toBe("urgent");

    const queue = getQueue();
    expect(queue.length).toBe(before + 1);

    // Ranked to the top of its band, and attributed to triage rather than the sweep.
    const raised = queue.find((item) => item.motherId === DEMO_MOTHER_ID);
    expect(raised?.source).toBe("triage");
    expect(raised?.band).toBe("urgent");
    expect(raised?.status).toBe("open");

    // Two pieces of evidence: the rule that fired, and her own words.
    expect(raised?.evidence.map((e) => e.kind)).toEqual(["triage", "message"]);

    expect(getAudit()[0].kind).toBe("escalation");
    expect(getAudit()[0].band).toBe("urgent");
  });

  it("sends escalation text assembled from the corpus, not generated", () => {
    sendMotherMessage("I am bleeding and it will not stop");
    const reply = getChat().at(-1);

    expect(reply?.role).toBe("nnneva");
    expect(reply?.fixed).toBe(true);
    expect(reply?.band).toBe("emergency");
    // The exact sentence from the corpus, so it cannot drift.
    expect(reply?.text).toContain("go to your health facility immediately");
  });

  it("answers a routine question from the corpus without touching the queue", () => {
    const before = getQueue().length;
    sendMotherMessage("I have heartburn most evenings now");

    expect(getQueue().length).toBe(before);
    const reply = getChat().at(-1);
    expect(reply?.source?.id).toBe("heartburn");
    expect(reply?.fixed).toBeUndefined();
  });

  it("saves an uncovered question instead of improvising an answer", () => {
    const before = getSavedQuestions().length;
    sendMotherMessage("Can I travel to my mother's village next month?");

    expect(getSavedQuestions().length).toBe(before + 1);
    expect(getChat().at(-1)?.savedQuestion).toBe(true);
  });

  it("does not escalate when she is asking about a danger sign hypothetically", () => {
    const before = getQueue().length;
    sendMotherMessage("What should I do if I start bleeding?");
    expect(getQueue().length).toBe(before);
  });
});

describe("the output guardrail", () => {
  beforeEach(() => {
    resetDemo();
  });

  it("records the block and delivers a rewritten response", () => {
    tripGuardrail();

    const entry = getAudit()[0];
    expect(entry.kind).toBe("blocked");
    expect(entry.actor).toBe("guardrail");
    expect(entry.detail).toContain("pre-eclampsia");

    // What she actually receives names no condition.
    expect(getChat().at(-1)?.text).not.toContain("pre-eclampsia");
  });
});

describe("human confirmation", () => {
  beforeEach(() => {
    resetDemo();
  });

  it("writes a named health worker to the audit log when an action is released", () => {
    const item = getQueue()[0];
    confirmAction({
      tool: "mark_as_contacted",
      motherId: item.motherId,
      label: "Mark as contacted",
      preview: "cleared from today's queue",
      reason: "test",
    });

    const entry = getAudit()[0];
    expect(entry.kind).toBe("action");
    expect(entry.actor).toBe("chw");
    expect(entry.detail).toContain("before_tool_call");

    expect(getQueue().find((q) => q.id === item.id)?.status).toBe("contacted");
  });
});
