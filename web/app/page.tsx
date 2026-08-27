import Link from "next/link";

import { COHORT_STATS } from "@/lib/fixtures";
import { IconArrow } from "@/components/ui";

export default function LandingPage() {
  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-(--container-page) px-5 pt-16 pb-20 md:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="pill bg-sand text-brown">Good Neighbor Agents · Agents for Humans</p>

            <h1 className="mt-6 text-display font-display text-ink">
              Four hundred mothers. One health worker. Two calls that matter.
            </h1>

            <p className="mt-6 max-w-xl text-subheading text-brown">
              Nnneva is an AI agent that watches over a community health programme&apos;s entire antenatal
              cohort — tracking who is due, who has fallen out of care, and who has just reported something
              that cannot wait — and surfaces to a human health worker only the mothers who actually need a
              human.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/console" className="btn btn-ink">
                Open the console
                <IconArrow className="size-4" />
              </Link>
              <Link href="/chat" className="btn btn-sand">
                See the mother&apos;s view
              </Link>
            </div>

            <p className="mt-5 text-[13px] leading-[1.5] text-muted">
              Synthetic cohort. No real patient data appears anywhere in this project.
            </p>
          </div>

          <CohortIllustration />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* The problem                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-y border-stone bg-sand">
        <div className="mx-auto max-w-(--container-page) px-5 py-20">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="eyebrow">The problem</p>
              <h2 className="mt-4 text-headline font-display text-ink">
                Most maternal deaths are not caused by a missing diagnosis. They are caused by delay.
              </h2>
            </div>
            <div className="space-y-5 text-body text-brown">
              <p>
                Delay in recognising that something is wrong. Delay in deciding to seek care. Delay in reaching a
                facility. The window between antenatal contacts is where those delays live, and it is almost
                entirely unmonitored.
              </p>
              <p>
                A primary health centre with four hundred enrolled mothers and three community health workers has
                no realistic way to know, on any given Tuesday, which of those four hundred women is drifting.
              </p>
              <p className="text-charcoal">Nnneva is the layer that watches that window.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Three surfaces                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-(--container-page) px-5 py-20">
        <p className="eyebrow">Three surfaces, one agent</p>
        <h2 className="mt-4 max-w-2xl text-headline font-display text-ink">
          The product is a process that runs whether or not anyone opens anything.
        </h2>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Surface
            index="01"
            title="The cohort sweep"
            mode="Autonomous · no human present"
            body="A scheduled run that walks the entire enrolled cohort and reasons about each mother's state, then produces a ranked review queue. Nobody triggers it. It has no tool for contacting anyone — structurally, it can only recommend."
          />
          <Surface
            index="02"
            title="The health worker console"
            mode="Human-in-the-loop"
            body="Where the sweep's output lands. Every item carries the agent's reasoning and the raw evidence. Actions that touch a mother are proposed by the agent and confirmed by the human, enforced at the tool boundary rather than by UI convention."
          />
          <Surface
            index="03"
            title="The mother's conversation"
            mode="Reactive · safety-gated"
            body="Every inbound message passes through deterministic triage before it reaches a model. Routine messages get a grounded answer. Anything in a danger band gets fixed escalation text and raises a queue item in the same request."
          />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Safety                                                           */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-y border-stone bg-sand">
        <div className="mx-auto max-w-(--container-page) px-5 py-20">
          <p className="eyebrow">Safety architecture</p>
          <h2 className="mt-4 max-w-3xl text-headline font-display text-ink">
            The model is never the first line of safety, and never the last.
          </h2>
          <p className="mt-5 max-w-2xl text-body text-brown">
            Three layers, in strict order. The ordering is the design.
          </p>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <Layer
              n="Layer 1"
              title="Deterministic triage"
              when="Before any model call"
              by="Pure Python over a reviewed JSON corpus"
              fails="Escalation"
              body="Every inbound message is matched against clinician-reviewable danger signs, each with a severity band and a gestational window. Reduced fetal movement is meaningless at eight weeks and critical at thirty-four. Negation and hypothetical phrasing are handled explicitly."
            />
            <Layer
              n="Layer 2"
              title="Constrained generation"
              when="During"
              by="Band-scoped prompt, retrieval restricted to the corpus"
              fails="Refusal"
              body="The model only ever operates inside the band triage assigned. In the urgent and emergency bands it does not write the escalation at all — that text is assembled from the corpus, because the highest-stakes sentence Nnneva says is the one it is least willing to let a model improvise."
            />
            <Layer
              n="Layer 3"
              title="Output guardrail"
              when="After every model call"
              by="InterventionHandler.after_model_call"
              fails="Regeneration, then refusal"
              body="Inspects every generated response before it reaches a mother and blocks condition names presented as conclusions, probability claims, dosing instructions, and reassurance that a symptom is definitely nothing. Blocks are written to the audit log."
            />
          </div>

          <div className="card-dark mt-4 p-8">
            <p className="eyebrow text-white/50">What Nnneva is not</p>
            <p className="mt-4 max-w-3xl text-subheading text-white/90">
              Nnneva does not diagnose. It does not name conditions, estimate a probability, prescribe, adjust
              medication, or decide that something is fine.
            </p>
            <p className="mt-4 max-w-3xl text-[15px] leading-[1.55] text-white/60">
              The set of things it is willing to say about a symptom is deliberately small: this is common and
              here is what usually helps; or, this needs a health worker today; or, this needs a health worker
              right now. There is no fourth option, and no path by which the language model can invent one.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Positioning                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-(--container-page) px-5 py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">On the competition</p>
            <h2 className="mt-4 text-headline font-display text-ink">
              There are already good AI maternal chatbots. Nnneva is not one.
            </h2>
            <p className="mt-5 text-body text-brown">
              HelpMum, TendherMom, Solayo and PROMPTS already do AI maternal messaging, and some do it well.
              Nnneva is the layer that watches four hundred mothers at once and tells one health worker which two
              to call.
            </p>
          </div>

          <div>
            <p className="eyebrow">Who it is for</p>
            <dl className="mt-4 divide-y divide-stone">
              <div className="py-5">
                <dt className="text-heading font-display text-ink">The community health worker</dt>
                <dd className="mt-2 text-[15px] leading-[1.55] text-brown">
                  One CHW carrying 100–400 enrolled mothers, working from a phone or a shared desktop, with no
                  time to review anyone who is fine. Nnneva turns an unreviewable caseload into a ranked daily
                  list of five to ten, each with a plain-language reason and the evidence behind it.
                </dd>
              </div>
              <div className="py-5">
                <dt className="text-heading font-display text-ink">The enrolled mother</dt>
                <dd className="mt-2 text-[15px] leading-[1.55] text-brown">
                  A woman between antenatal contacts, at home, with a question or a symptom and no cheap way to
                  know whether it matters. Nnneva answers safely, saves what should be asked at her next contact,
                  and escalates to a human the moment it hits a danger sign.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                           */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-stone bg-sand">
        <div className="mx-auto flex max-w-(--container-page) flex-wrap items-center justify-between gap-4 px-5 py-10">
          <div className="max-w-2xl">
            <p className="text-[15px] font-semibold text-charcoal">Nnneva</p>
            <p className="mt-1 text-[13px] leading-[1.5] text-muted">
              Built on the Strands Agents SDK. Clinical corpus derived from WHO 2016 antenatal care
              recommendations and Nigeria FMoH national guidelines — requires clinician review before real
              deployment.
            </p>
          </div>
          <Link href="/console" className="btn btn-ink">
            Open the console
          </Link>
        </div>
      </footer>
    </>
  );
}

/* -------------------------------------------------------------------------- */

function Surface({
  index,
  title,
  mode,
  body,
}: {
  index: string;
  title: string;
  mode: string;
  body: string;
}) {
  return (
    <article className="card flex flex-col p-8">
      <span className="font-display text-[15px] text-muted">{index}</span>
      <h3 className="mt-4 text-heading font-display text-ink">{title}</h3>
      <p className="mt-2 text-[13px] font-semibold text-ember">{mode}</p>
      <p className="mt-4 text-[15px] leading-[1.55] text-brown">{body}</p>
    </article>
  );
}

function Layer({
  n,
  title,
  when,
  by,
  fails,
  body,
}: {
  n: string;
  title: string;
  when: string;
  by: string;
  fails: string;
  body: string;
}) {
  return (
    <article className="card flex flex-col p-8">
      <p className="eyebrow">{n}</p>
      <h3 className="mt-3 text-heading font-display text-ink">{title}</h3>
      <p className="mt-4 flex-1 text-[15px] leading-[1.55] text-brown">{body}</p>

      <dl className="mt-6 divide-y divide-stone border-t border-stone pt-1 text-[13px]">
        <Row label="Runs" value={when} />
        <Row label="Enforced by" value={by} />
        <Row label="Fails towards" value={fails} />
      </dl>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-2.5">
      <dt className="w-24 shrink-0 font-semibold text-muted">{label}</dt>
      <dd className="text-charcoal">{value}</dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The cohort, drawn. Forty-two enrolled: two hollow because consent was not
 * given and the sweep skips them, six coloured by the band the sweep assigned,
 * the rest reviewed and fine. The product's argument as a picture.
 */
function CohortIllustration() {
  const COLS = 7;
  const STEP = 46;
  const R = 13;

  // Fixed assignment, so the drawing never changes between renders.
  const bands: Record<number, string> = {
    3: "var(--color-honey)",
    11: "var(--color-honey)",
    17: "var(--color-alert)",
    24: "var(--color-honey)",
    31: "var(--color-mint)",
    38: "var(--color-mint)",
  };
  const noConsent = new Set([8, 27]);

  const dots = Array.from({ length: COHORT_STATS.enrolled }, (_, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    // Deterministic scatter — integer arithmetic, so server and client agree.
    const jitterX = (((i * 37) % 11) - 5) * 0.9;
    const jitterY = (((i * 53) % 9) - 4) * 0.9;
    return { i, cx: 30 + col * STEP + jitterX, cy: 30 + row * STEP + jitterY };
  });

  return (
    <figure className="rounded-illus bg-sand p-8">
      <svg
        viewBox="0 0 340 300"
        className="w-full"
        role="img"
        aria-label={`${COHORT_STATS.enrolled} enrolled mothers: six flagged for review, two excluded because consent was not given, the rest reviewed automatically.`}
      >
        {dots.map(({ i, cx, cy }) =>
          noConsent.has(i) ? (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={R}
              fill="none"
              stroke="var(--color-rule)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          ) : (
            <circle key={i} cx={cx} cy={cy} r={R} fill={bands[i] ?? "var(--color-stone)"} />
          ),
        )}
      </svg>

      <figcaption className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted">
        <Key colour="var(--color-stone)" label="Reviewed, no action needed" />
        <Key colour="var(--color-honey)" label="Urgent" />
        <Key colour="var(--color-alert)" label="Emergency" />
        <Key colour="var(--color-mint)" label="Routine follow-up" />
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full border border-dashed border-rule" aria-hidden />
          Consent not given — excluded
        </span>
      </figcaption>
    </figure>
  );
}

function Key({ colour, label }: { colour: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="size-2.5 rounded-full" style={{ backgroundColor: colour }} aria-hidden />
      {label}
    </span>
  );
}
