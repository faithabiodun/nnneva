import { AGENT_STEPS } from "@/lib/marketing";

/**
 * "What Nnneva does" — one message on the left, six things the agent does with
 * it on the right, advancing together.
 *
 * The cycle is CSS only: a 30s loop where each step's rail label, progress bar
 * and panel share the same negative animation-delay, so they cannot fall out of
 * step with one another the way a JS timer and a re-render can.
 */
export function AgentRail() {
  return (
    <section className="mx-auto max-w-(--container-app) px-6 pt-16 pb-8 sm:px-8">
      <h2 className="text-center font-display text-[clamp(28px,3.4vw,40px)] leading-tight font-medium tracking-[-0.025em]">
        What Nnneva does
      </h2>

      <div className="mt-10 grid gap-10 lg:mt-13 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-16">
        {/* ---- The message, and the rail ---------------------------------- */}
        <div className="min-w-0 lg:sticky lg:top-16">
          <p className="eyebrow mb-3.5">One message from you</p>

          <p className="rounded-[20px] rounded-bl-[7px] bg-ink px-6 py-5.5 text-[16.5px] leading-[1.55] text-white">
            I have an antenatal appointment next Thursday. I need to prepare questions, get my
            blood test done, and remember everything I need.
          </p>

          <p className="mt-5.5 flex items-center gap-2.5">
            <span className="animate-pulse-soft size-2 rounded-full bg-pink" aria-hidden />
            <span className="text-small text-muted">Everything on the right happens without you.</span>
          </p>

          <ol className="mt-6 flex flex-col">
            {AGENT_STEPS.map((step, i) => (
              <li key={step.label} className="flex items-center gap-3 py-2.5">
                <span
                  className="nv-rail-text text-[14.5px]"
                  data-step={i}
                  style={{ animationDelay: `${-30 + i * 5}s` }}
                >
                  {step.label}
                </span>
                <span
                  className="ml-auto h-[3px] w-13 shrink-0 overflow-hidden rounded-sm bg-line"
                  aria-hidden
                >
                  <span
                    className="nv-rail-bar block h-full w-0 rounded-sm bg-pink"
                    style={{ animationDelay: `${-30 + i * 5}s` }}
                  />
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* ---- The panels -------------------------------------------------- */}
        <div className="relative min-h-[420px] min-w-0">
          {AGENT_STEPS.map((step, i) => (
            <article
              key={step.label}
              data-step={i}
              className="nv-panel card absolute inset-x-0 top-0 p-6 sm:p-8"
              style={{ animationDelay: `${-30 + i * 5}s` }}
            >
              <h3 className="text-h3 font-sans font-medium">{step.title}</h3>
              <p className="mt-2.5 max-w-prose text-body text-muted">{step.body}</p>

              <div className="mt-6">
                {step.kind === "chips" && (
                  <ul className="flex flex-wrap gap-2">
                    {step.chips.map((c) => (
                      <li key={c} className="pill bg-green-wash text-green">
                        {c}
                      </li>
                    ))}
                  </ul>
                )}

                {step.kind === "checks" && (
                  <ul className="flex flex-col gap-2.5">
                    {step.checks.map((c) => (
                      <li key={c} className="flex items-center gap-2.5 text-small text-ink">
                        <Tick />
                        {c}
                      </li>
                    ))}
                  </ul>
                )}

                {step.kind === "plan" && (
                  <ol className="flex flex-col gap-2">
                    {step.plan.map((p, n) => (
                      <li key={p.text} className="well flex items-center gap-3 px-4 py-3">
                        <span className="tnum text-caption text-faint">{n + 1}</span>
                        <span className="min-w-0 flex-1 text-small text-ink">{p.text}</span>
                        <span className="pill bg-white text-caption text-muted-2 hairline">
                          {p.meta}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}

                {step.kind === "counts" && (
                  <ul className="grid grid-cols-2 gap-3">
                    {step.counts.map((c) => (
                      <li key={c.label} className="well px-4 py-4">
                        <p className="tnum font-display text-[30px] leading-none text-ink">{c.n}</p>
                        <p className="mt-1.5 text-caption text-muted">{c.label}</p>
                      </li>
                    ))}
                  </ul>
                )}

                {step.kind === "approval" && (
                  <div className="rounded-md bg-pink-wash p-5">
                    <p className="eyebrow text-pink">{step.approval.eyebrow}</p>
                    <p className="mt-2.5 text-body text-ink">{step.approval.question}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="btn btn-pink py-2.5 text-small">{step.approval.accept}</span>
                      <span className="btn btn-quiet py-2.5 text-small">{step.approval.decline}</span>
                    </div>
                  </div>
                )}

                {step.kind === "memory" && (
                  <ul className="flex flex-col gap-2">
                    {step.memory.map((m) => (
                      <li
                        key={m}
                        className="well flex items-center gap-3 px-4 py-3 text-small text-ink"
                      >
                        <span className="size-1.5 shrink-0 rounded-full bg-green-soft" aria-hidden />
                        {m}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-green" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" opacity="0.35" />
      <path
        d="M5 8.2 7 10.2 11 5.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
