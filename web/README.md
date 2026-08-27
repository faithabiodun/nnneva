# Nnneva — frontend

The three surfaces of Nnneva, built as a Next.js app. No backend required: the
whole thing runs against a seeded synthetic cohort so a judge can clone it and
have it working in two commands.

```bash
npm install
npm run dev     # http://localhost:3000
```

| Command            | What it does                                       |
| ------------------ | -------------------------------------------------- |
| `npm run dev`      | Dev server on port 3000                            |
| `npm run build`    | Production build                                   |
| `npm test`         | The red-flag triage suite and the inbound-path suite |
| `npm run lint`     | ESLint                                             |

## The three routes

| Route      | Surface                                                                  |
| ---------- | ------------------------------------------------------------------------ |
| `/`        | Landing page — the pitch, the safety architecture, the positioning        |
| `/console` | Surface 2 — the health worker console: ranked queue, reasoning, evidence, confirmation, audit log |
| `/chat`    | Surface 3 — the mother's conversation, with the triage trace beside it    |

**Open `/console` first.** The whole argument of the product is that a process
ran at 06:00 with nobody watching and reduced 40 mothers to 6. A judge who sees
the chat first files this as a pregnancy chatbot in the first eight seconds.

## Demonstrating the live escalation

Open `/chat` and `/console` in two browser windows, side by side. State is held
in a module-level store backed by `localStorage` and synced across tabs with a
`BroadcastChannel`, so:

1. In `/chat`, click the **Urgent** or **Emergency** prompt chip.
2. Deterministic triage runs, assigns a band, and the trace appears on the right.
3. Fixed escalation text — assembled from the corpus, not generated — is sent.
4. The queue item appears in `/console` in the same moment, ranked to the top.

The **Trip the guardrail** button on `/chat` runs a model response that names a
condition, so the Layer 3 output guardrail can be shown catching it on camera.
The block, the matched span, and the rewrite instruction land in the audit log
under the **Audit log** tab in the console.

**Reset demo state** in the console header returns everything to the seed.

## How the safety layers map to the code

| Layer                | File                | Notes                                                    |
| -------------------- | ------------------- | -------------------------------------------------------- |
| 1 — deterministic triage | `lib/triage.ts` | Runs before any model call. Fails *towards* escalation.   |
| 2 — the corpus       | `lib/corpus.ts`     | Danger signs with severity bands and gestational windows; routine entries with citations. |
| 3 — output guardrail | `lib/guardrail.ts`  | Blocks condition names, probability claims, dosing, false reassurance. |
| Action confirmation  | `components/console/ConfirmDialog.tsx` | Where the `before_tool_call` pause surfaces. |

`lib/triage.ts` and `lib/corpus.ts` are a **mirror** of the Python
implementation so the demo runs without a backend. The Python versions are the
source of truth; if the two ever disagree, the Python one is right.

`lib/triage.test.ts` is the red-flag suite — the build spec's day-5 milestone.
It covers the gestational windows (the same sentence escalates at 33 weeks and
does not at 12), negation, hypothetical phrasing, and the fail-towards-escalation
behaviour when triage itself throws.

## Data

`lib/fixtures.ts` — 42 fictional mothers from a fixed seed, two of whom have not
consented and are therefore excluded from the sweep. No real patient data
appears anywhere in this project.

The clock is pinned to `DEMO_NOW` (Tuesday 8 September 2026, just after the
06:00 sweep) in `lib/schedule.ts`. Everything is derived from it, so the console
renders identically on every run and the queue cannot drift between recording
takes.

## Design

Tokens live in `app/globals.css` under `@theme`, adapted from the Family design
system. The rules worth not breaking:

- Warm parchment canvas (`--color-cream`), never pure white as the page background.
- Cards are defined by a **1px inset hairline**, not a drop shadow. Nothing
  heavier than `rgba(0,0,0,0.04)` for standard elevation.
- Flat fills only. No gradients.
- Display face at 44–68px; Inter never goes above 23px.
- Band colour comes from the palette: `alert` = emergency, `honey` = urgent,
  `mint` = routine.

## Clinical sources

The corpus is derived from the WHO 2016 antenatal care recommendations, the WHO
essential-practice guide for pregnancy and childbirth (2015), and Nigeria's FMoH
national antenatal guidelines. **It requires clinician review before any real
deployment** — see the header of `lib/corpus.ts`.
