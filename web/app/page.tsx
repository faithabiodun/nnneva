import Image from "next/image";
import Link from "next/link";

import { AgentRail } from "@/components/marketing/AgentRail";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { GUARDRAILS, HOW_IT_WORKS } from "@/lib/marketing";
import hero from "@/public/hero.jpg";

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-canvas">
      {/* Reading progress. Scroll-driven, so it costs no JavaScript. */}
      <div
        className="fixed inset-x-0 top-0 z-80 h-[3px] origin-left bg-pink [animation-range:0%_100%] [animation-timeline:scroll()] [animation:nv-grow_linear_both]"
        aria-hidden
      />

      {/* ---- Hero ---------------------------------------------------------- */}
      <div className="relative flex min-h-[94dvh] flex-col overflow-hidden">
        <Image
          src={hero}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[52%_32%]"
        />
        {/* Two scrims: a vertical wash that lands on the canvas colour, and a
            soft radial that lifts the centre so the headline sits on light. */}
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(253,250,248,.74)_0%,rgba(253,250,248,.34)_26%,rgba(251,247,244,.52)_58%,rgba(251,247,244,.94)_86%,#FBF7F4_100%)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(62%_46%_at_50%_40%,rgba(255,255,255,.78),rgba(255,255,255,0)_72%)]"
          aria-hidden
        />

        <SiteHeader />

        <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pt-15 pb-24 text-center sm:px-8">
          <div className="mx-auto w-full max-w-[1040px]">
            <h1 className="mx-auto font-display text-[clamp(40px,7.2vw,96px)] leading-[1.02] font-semibold tracking-[-0.032em] text-balance text-ink">
              You&rsquo;re not alone,
              <br />
              <span className="text-pink">Nnneva</span> is here.
            </h1>

            <p className="mx-auto mt-7 max-w-[600px] text-[clamp(17px,1.7vw,23px)] leading-[1.55] text-pretty text-[#3F5850]">
              Pregnancy has enough to carry. Let Nnneva carry the rest.
            </p>

            <div className="mt-8 flex justify-center">
              <Link
                href="/onboarding"
                className="rounded-pill bg-pink px-8 py-4 text-[16px] font-medium text-white shadow-[0_10px_30px_rgba(214,43,96,0.28)] transition-colors hover:bg-pink-deep"
              >
                Start with Nnneva
              </Link>
            </div>
          </div>

          <div className="animate-bob absolute inset-x-0 bottom-6 flex flex-col items-center gap-2.5">
            <span className="text-[11px] tracking-[0.16em] uppercase text-muted-2">Scroll</span>
            <svg viewBox="0 0 24 24" className="size-4.5 text-muted-2" fill="none" aria-hidden>
              <path
                d="M12 5v13M6.5 12.5 12 18l5.5-5.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </section>
      </div>

      {/* ---- The problem --------------------------------------------------- */}
      <section className="mx-auto max-w-(--container-app) px-6 pt-16 pb-5 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-16">
          <h2 className="font-display text-[clamp(26px,3.2vw,38px)] leading-[1.12] font-medium tracking-[-0.025em]">
            Information was never the missing piece.
          </h2>
          <p className="text-[17px] leading-[1.68] text-pretty text-[#4C625A]">
            Pregnancy creates a large amount of coordination work between clinical visits:
            appointments, tests, questions, preparation, reminders, errands, and communication with
            people who are helping. Each task is small, but the accumulation creates mental load.
            The mother is still the one responsible for remembering what matters, deciding what to
            do next, and coordinating it all herself.
          </p>
        </div>
      </section>

      <AgentRail />

      {/* ---- How it works --------------------------------------------------- */}
      <section className="mt-8 bg-surface-2">
        <div className="mx-auto max-w-(--container-app) px-6 py-16 sm:px-8">
          <h2 className="text-center font-display text-[clamp(26px,3.2vw,38px)] font-medium tracking-[-0.025em]">
            How it works
          </h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((step, i) => (
              <li key={step.title}>
                <p className="tnum font-display text-[34px] leading-none text-pink">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-4 text-h3 font-sans font-medium">{step.title}</h3>
                <p className="mt-2 text-body text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- Where it stops -------------------------------------------------- */}
      <section className="mx-auto max-w-(--container-app) px-6 py-20 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <h2 className="font-display text-[clamp(26px,3.2vw,38px)] leading-[1.12] font-medium tracking-[-0.025em]">
              Where Nnneva stops
            </h2>
            <p className="mt-5 text-[17px] leading-[1.68] text-[#4C625A]">
              Nnneva does not try to be a doctor. When a message looks like a medical red flag,
              normal automation stops and you are pointed at care instead.
            </p>
            <Link href="/safety" className="btn btn-quiet mt-7">
              See the safety path
            </Link>
          </div>

          <ul className="flex flex-col gap-2.5">
            {GUARDRAILS.map((g) => (
              <li key={g} className="card flex items-start gap-3 p-5">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-danger" aria-hidden />
                <span className="text-body text-ink">{g}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- Close ------------------------------------------------------------ */}
      <section className="bg-ink">
        <div className="mx-auto max-w-(--container-app) px-6 py-20 text-center sm:px-8">
          <h2 className="font-display text-[clamp(30px,4vw,52px)] font-medium tracking-[-0.025em] text-canvas">
            Fewer things to remember.
          </h2>
          <p className="mx-auto mt-4 max-w-[520px] text-lead text-green-soft">
            Set up your pregnancy context in about two minutes.
          </p>
          <Link
            href="/onboarding"
            className="mt-8 inline-flex rounded-pill bg-pink px-8 py-4 text-[16px] font-medium text-white transition-colors hover:bg-pink-deep"
          >
            Start with Nnneva
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-(--container-app) flex-wrap items-center justify-between gap-4 px-6 py-10 sm:px-8">
        <span className="text-caption text-muted-2">Nnneva · Maternal-care agent</span>
        <span className="max-w-prose text-caption text-muted-2">
          No diagnosis. No prescriptions. Medical decisions stay with your clinician.
        </span>
      </footer>
    </main>
  );
}
