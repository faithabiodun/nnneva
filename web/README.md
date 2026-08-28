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

## Routes

The console shell (sidebar, overview, queue, cohort, mothers, questions, audit)
lives under the `app/(console)` route group. The mother's conversation sits
outside it, with its own layout, because she is not a user of the health
worker's product and should never see its chrome.

| Route           | Surface                                                                   |
| --------------- | ------------------------------------------------------------------------- |
| `/`             | **Overview** — the sweep result: two numbers, the ranked queue, the cohort ring |
| `/queue`        | Surface 2 — the ranked queue with reasoning, evidence and the confirmation gate |
| `/cohort`       | Cohort intelligence — the ring, ANC progression, the consent position      |
| `/mothers`      | The directory, ordered by who needs reading first                          |
| `/mothers/[id]` | Mother profile — the pregnancy timeline, record, consent, saved questions  |
| `/questions`    | The question bank — everything Nnneva declined to answer                   |
| `/audit`        | Every escalation, block and confirmed action                               |
| `/chat`         | Surface 3 — the mother's conversation, with the triage trace beside it     |
| `/about`        | The pitch and the architecture, for a judge who wants it in prose          |

**`/` opens on the sweep, not the chat.** The whole argument of the product is
that a process ran at 06:00 with nobody watching and reduced 40 mothers to 6. A
judge who sees a chat window first files this as a pregnancy chatbot in the
first eight seconds, and everything after that is climbing out of that hole.

## Demonstrating the live escalation

Open `/chat` and `/queue` in two browser windows, side by side. State is held
in a module-level store backed by `localStorage` and synced across tabs with a
`BroadcastChannel`, so:

1. In `/chat`, click the **Urgent** or **Emergency** prompt chip.
2. Deterministic triage runs, assigns a band, and the trace appears on the right.
3. Fixed escalation text — assembled from the corpus, not generated — is sent.
4. The queue item appears in `/queue` in the same moment, ranked to the top.

The **Trip the guardrail** button on `/chat` runs a model response that names a
condition, so the Layer 3 output guardrail can be shown catching it on camera.
The block, the matched span, and the rewrite instruction land in the audit log
at `/audit`.

**Reset demo** in the queue header returns everything to the seed.

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

A midnight-teal command console for the health worker, and a pearl surface for
the mother. Tokens live in `app/globals.css` under `@theme`. The rules worth not
breaking:

- **Two canvases, never mixed on one screen.** The console is midnight
  (`--color-canvas`); the mother's conversation is pearl. The inversion is
  load-bearing — it is the fastest way to tell the two users apart.
- **Elevation is tonal, not shadowed.** A card is a lighter teal than its canvas
  plus a 1px inset hairline. Only dialogs get a real shadow.
- **Colour is meaning.** Mint is on track, amber is attention, red is urgent.
  Nothing is red for decoration: if it is red, a mother is waiting.
- **Two red tokens.** `--color-red` carries every red *fill* — rail, dot, ring
  segment, alarm chip — where WCAG asks 3:1 because it is a graphic.
  `--color-red-text` is the lightened value used wherever red is a *word*, which
  needs 4.5:1. One value cannot do both jobs on this canvas.
- **Chip grounds are opaque** (`--color-mint-wash` and friends), composited over
  midnight rather than over whatever card they land on. An `accent/15` tint
  inherits its parent, so the same chip measured differently on a card and
  inside a selected one.
- **Geometry:** pill buttons, 16px inputs, 24px cards, 30px for the one elevated
  card per screen, 8px icon containers.
- **Type:** Manrope throughout, 500 for interface text and 600 for headings.
  Display sizes are fluid so 390px never overflows.
- **Motion is restrained.** The agent indicator breathes on a 3.4s cycle; cards
  rise 8px on entry. Everything is disabled under `prefers-reduced-motion`.

Band colour is defined once, in `components/ui.tsx` (`BAND_STYLE`,
`STATE_STYLE`), rather than spelled out at each call site.

## Accessibility

Checked against the rendered DOM rather than against the source, because the
interesting failures only appear once a component is composed:

- **Contrast** — every text/background pair on every route is at or above WCAG
  AA, compositing real ancestor backgrounds and Tailwind's `oklab()` alpha
  output. Graphical fills are held to 3:1 and text to 4.5:1, which is why red
  has two tokens.
- **Structure** — one `<h1>` per route, no skipped heading levels, a `<main>`
  landmark, an accessible name on every control, and lists that contain only
  `<li>`.
- **Keyboard** — the confirmation dialog traps Tab and Shift+Tab, closes on
  Escape, and returns focus to whatever opened it. This matters more here than
  on a normal modal: without the trap a keyboard user can tab out of a pending
  mother-facing action, activate something behind the overlay, and never learn
  what they released. The mobile drawer does the same and locks body scroll
  while open.
- **Motion** — every animation resolves to `none` under
  `prefers-reduced-motion: reduce`.

Every text/background pair on every route is at or above WCAG AA — verified
against the rendered DOM (compositing real ancestor backgrounds, and Tailwind's
`oklab()` alpha output) rather than against the token table, because several
failures only appeared once a chip landed inside a selected card.

## Clinical sources

The corpus is derived from the WHO 2016 antenatal care recommendations, the WHO
essential-practice guide for pregnancy and childbirth (2015), and Nigeria's FMoH
national antenatal guidelines. **It requires clinician review before any real
deployment** — see the header of `lib/corpus.ts`.
