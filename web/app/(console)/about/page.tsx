import Link from "next/link";

import { Card, IconArrow, IconCheck, SectionHead } from "@/components/ui";

export const metadata = { title: "How it works" };

/**
 * The argument, for a judge who wants it in prose rather than in the console.
 *
 * Deliberately the last item in the navigation. The console is the pitch; this
 * page only exists because Presentation is a fifth of the score and a judge may
 * never click anything at all.
 */

const SURFACES = [
  {
    number: "01",
    name: "The cohort sweep",
    mode: "Autonomous · no human present",
    body: "A scheduled run walks the entire enrolled cohort and reasons about each mother's state: where she is in the ANC schedule, whether she has missed a contact, how long since she last made contact, what she has reported recently, and what has changed. It produces a ranked review queue. Nobody triggers it.",
    href: "/",
    cta: "See this morning's sweep",
  },
  {
    number: "02",
    name: "The health worker console",
    mode: "Human in the loop",
    body: "Where the sweep's output lands. The health worker sees the ranked queue, each item carrying the agent's reasoning and the raw evidence. Actions that touch a mother are proposed by the agent and confirmed by the human — enforced by a Strands intervention at the tool boundary, not by UI convention, so the guarantee holds even if someone calls the agent from a script.",
    href: "/queue",
    cta: "Open the review queue",
  },
  {
    number: "03",
    name: "The mother's conversation",
    mode: "Reactive · safety-gated",
    body: "Every inbound message passes through deterministic triage before it reaches a model. Routine messages get an educational answer grounded in the curated corpus, with its source shown. Anything in a danger band gets fixed, non-generated escalation text and creates a high-priority item in the health worker's queue within the same request.",
    href: "/chat",
    cta: "Open her side",
  },
];

const LAYERS = [
  {
    layer: "Layer 1",
    name: "Deterministic triage",
    runs: "Before any model call",
    enforced: "Pure Python over a reviewed JSON corpus",
    fails: "Towards escalation",
  },
  {
    layer: "Layer 2",
    name: "Constrained generation",
    runs: "During",
    enforced: "Band-scoped prompt, retrieval restricted to the corpus",
    fails: "Towards refusal",
  },
  {
    layer: "Layer 3",
    name: "Output guardrail",
    runs: "After every model call",
    enforced: "InterventionHandler.after_model_call",
    fails: "Towards regeneration, then refusal",
  },
  {
    layer: "Layer 4",
    name: "Action confirmation",
    runs: "Before any mother-facing tool",
    enforced: "InterventionHandler.before_tool_call → Confirm",
    fails: "Towards no action taken",
  },
];

const STRANDS = [
  ["Interventions", "strands.interventions.InterventionHandler", "The safety spine — tool gating, guardrail, band propagation."],
  ["Human-in-the-loop", "strands.vended_interventions.HumanInTheLoop", "Wraps the console. Read-only cohort tools run freely; anything touching a mother pauses."],
  ["Multi-agent graph", "strands.multiagent.GraphBuilder", "Triage routing as graph structure, not a prompt instruction the model can talk itself out of."],
  ["Agent memory", "strands.memory.MemoryManager", "Longitudinal pregnancy context — week 18 is available in week 32."],
  ["Session persistence", "strands.session.FileSessionManager", "Per-mother conversation state, file-backed so a judge can clone and run."],
  ["Tools", "strands.tool", "Capability scoped per agent. The sweep agent has no messaging tool at all."],
  ["Hooks", "strands.hooks", "The audit log. Every tool call and model response, with the band attached."],
  ["MCP client", "strands.tools.mcp.MCPClient", "The integration seam. One server in the build; the architecture shows where the rest attach."],
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-(--container-read) px-5 py-10 lg:px-10 lg:py-16">
      {/* ---- Pitch -------------------------------------------------------- */}
      <section>
        <p className="eyebrow">Good Neighbor Agents</p>
        <h1 className="mt-5 text-hxl text-text">
          One health worker.
          <br />
          Four hundred mothers.
          <br />
          <span className="text-aqua">No way to know who is drifting.</span>
        </h1>

        <p className="mt-8 max-w-3xl text-lead leading-relaxed text-text-2">
          Most maternal deaths are not caused by a missing diagnosis at the bedside. They are caused
          by delay — delay in recognising that something is wrong, delay in deciding to seek care,
          delay in reaching a facility. The window between antenatal contacts is where those delays
          live, and it is almost entirely unmonitored.
        </p>

        <Card className="mt-10 p-7 lg:p-9" lift>
          <p className="eyebrow">The pitch</p>
          <p className="mt-5 text-h2 leading-snug text-text">
            Nnneva is an AI agent that watches over a community health programme&rsquo;s entire
            antenatal cohort — tracking who is due, who has fallen out of care, and who has just
            reported something that cannot wait — and surfaces to a human health worker only the
            mothers who actually need a human.
          </p>
        </Card>
      </section>

      {/* ---- Surfaces ----------------------------------------------------- */}
      <section className="mt-16">
        <SectionHead
          eyebrow="The product"
          title="Three surfaces, one agent"
          note="If a proposed feature is not one of these, it is out of scope."
        />

        <div className="mt-8 flex flex-col gap-4">
          {SURFACES.map((surface) => (
            <Card key={surface.number} className="p-6 lg:p-8">
              <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-start lg:gap-10">
                <p className="rank text-h2 leading-none text-text-3">{surface.number}</p>

                <div className="min-w-0">
                  <h3 className="text-h2">{surface.name}</h3>
                  <p className="mt-2 text-caption text-aqua">{surface.mode}</p>
                  <p className="mt-4 text-body leading-relaxed text-text-2">{surface.body}</p>
                </div>

                <Link href={surface.href} className="btn btn-quiet shrink-0">
                  {surface.cta}
                  <IconArrow className="size-3.5" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ---- Safety ------------------------------------------------------- */}
      <section className="mt-16">
        <SectionHead
          eyebrow="Safety architecture"
          title="The model is never the first line of safety, and never the last"
          note="Four gates, in strict order. The ordering is the design — and each one is written to fail in the direction that costs a health worker two minutes rather than the direction that costs more than that."
        />

        <div className="scroll-x mt-8">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line-strong">
                {["", "Runs", "Enforced by", "Fails towards"].map((heading) => (
                  <th key={heading} scope="col" className="pb-3 pr-6 last:pr-0">
                    <span className="eyebrow">{heading}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LAYERS.map((row) => (
                <tr key={row.layer} className="border-b border-line last:border-b-0">
                  <th scope="row" className="py-5 pr-6 align-top">
                    <span className="block text-caption text-text-3">{row.layer}</span>
                    <span className="mt-1 block text-body font-semibold text-text">{row.name}</span>
                  </th>
                  <td className="py-5 pr-6 align-top text-small text-text-2">{row.runs}</td>
                  <td className="py-5 pr-6 align-top text-small text-text-2">{row.enforced}</td>
                  <td className="py-5 align-top text-small font-semibold text-mint">{row.fails}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- Strands ------------------------------------------------------ */}
      <section className="mt-16">
        <SectionHead
          eyebrow="Technical design"
          title="Strands features, by name"
          note="Verified against strands-agents 1.53 rather than recalled from documentation."
        />

        <ul className="mt-8 grid gap-2.5 lg:grid-cols-2">
          {STRANDS.map(([name, importPath, what]) => (
            <li key={name} className="card p-5">
              <p className="text-body font-semibold text-text">{name}</p>
              <code className="mt-2 block text-caption break-all text-aqua">{importPath}</code>
              <p className="mt-3 text-small leading-relaxed text-text-2">{what}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- What it is not ----------------------------------------------- */}
      <section className="mt-16">
        <Card className="p-7 lg:p-9" lift>
          <SectionHead
            eyebrow="Boundaries"
            title="What Nnneva is not"
            note="Stating this clearly is not defensive hedging — it is the product thesis."
          />

          <p className="mt-7 max-w-3xl text-body leading-relaxed text-text-2">
            Nnneva does not diagnose. It does not name conditions. It does not tell a mother what is
            causing a symptom, does not estimate a probability, does not prescribe, does not adjust
            medication, and does not decide that something is fine. The set of things it is willing
            to say about a symptom is deliberately small:
          </p>

          <ul className="mt-6 grid gap-2.5 sm:grid-cols-3">
            {[
              "This is common, and here is what usually helps.",
              "This needs a health worker today.",
              "This needs a health worker right now.",
            ].map((line) => (
              <li key={line} className="well flex gap-3 p-5">
                <IconCheck className="mt-0.5 size-4 shrink-0 text-mint" />
                <span className="text-small leading-relaxed text-text">{line}</span>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-body leading-relaxed text-text-2">
            There is no fourth option, and no path by which the language model can invent one.
          </p>
        </Card>
      </section>

      {/* ---- Corpus ------------------------------------------------------- */}
      <section className="mt-16">
        <SectionHead
          eyebrow="Clinical knowledge"
          title="A small, curated, versioned corpus"
          note="Retrieval is restricted to it. The model is not permitted to answer clinical questions from its own parametric knowledge, and every response shows which entry it drew on."
        />

        <ul className="mt-8 grid gap-2.5 sm:grid-cols-3">
          {[
            ["WHO", "Recommendations on antenatal care for a positive pregnancy experience, 2016"],
            ["WHO", "Pregnancy, childbirth, postpartum and newborn care — essential practice guide"],
            ["Nigeria FMoH", "National antenatal care guidelines"],
          ].map(([body, title]) => (
            <li key={title} className="card p-5">
              <p className="eyebrow">{body}</p>
              <p className="mt-3 text-small leading-relaxed text-text">{title}</p>
            </li>
          ))}
        </ul>

        <p className="mt-6 max-w-3xl text-small leading-relaxed text-text-3">
          Every corpus file carries a header naming its source and stating that it requires clinician
          review before real deployment. That header is not a disclaimer — it is a statement about
          how the system is meant to be maintained, and it is the difference between a project that
          could be deployed and one that merely demos. No real patient data appears anywhere in this
          build; every mother in the cohort is synthetic and generated from a fixed seed.
        </p>
      </section>

      <section className="mt-16">
        <Card className="flex flex-wrap items-center gap-6 p-7 lg:p-9">
          <div className="min-w-0 flex-1">
            <h2 className="text-h2">Start where a health worker starts.</h2>
            <p className="mt-2 text-small text-text-2">
              The sweep ran at 06:00. Nobody triggered it.
            </p>
          </div>
          <Link href="/" className="btn btn-aqua">
            Open the overview
            <IconArrow className="size-3.5" />
          </Link>
        </Card>
      </section>
    </div>
  );
}
