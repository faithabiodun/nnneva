# Nnneva

**A maternal care coordination agent for community health programmes.**

Nnneva watches over a community health programme's entire antenatal cohort —
tracking who is due, who has fallen out of care, and who has just reported
something that cannot wait — and surfaces to a human health worker only the
mothers who actually need a human.

---

## The problem

Most maternal deaths are not caused by a missing diagnosis at the bedside. They
are caused by delay: delay in recognising that something is wrong, delay in
deciding to seek care, delay in reaching a facility. The window between
antenatal contacts is where those delays live, and it is almost entirely
unmonitored.

A primary health centre with four hundred enrolled mothers and three community
health workers has no realistic way to know, on any given Tuesday, which of
those four hundred women is drifting.

Nnneva is the layer that watches that window.

## Two users

| Who | What Nnneva does for them |
| --- | --- |
| **The community health worker** — one CHW carrying 100–400 enrolled mothers, working from a phone or a shared desktop | Turns an unreviewable caseload into a ranked daily list of five to ten mothers, each with a plain-language reason and the evidence behind it |
| **The enrolled mother** — a woman between antenatal contacts, at home, with a question or a symptom | Answers safely and immediately, saves what should be asked at the next contact, and escalates to a human the moment it hits a danger sign |

## Three surfaces, one agent

1. **The cohort sweep** *(autonomous, no human present)* — a scheduled run that
   walks the enrolled cohort and reasons about each mother's state, producing a
   ranked review queue. Nobody triggers it. The sweep agent has no messaging
   tool at all, so it structurally cannot contact anyone; it can only ever
   produce recommendations.
2. **The health worker console** *(human in the loop)* — where the sweep's
   output lands, with reasoning and raw evidence attached. Every action that
   touches a mother is proposed by the agent and confirmed by the human,
   enforced at the tool boundary rather than by UI convention.
3. **The mother's conversation** *(reactive, safety-gated)* — every inbound
   message passes through deterministic triage before it reaches a model.

## Safety architecture

Four gates, in strict order. The ordering is the design: **the model is never
the first line of safety, and never the last.**

| | Runs | Enforced by | Fails towards |
| --- | --- | --- | --- |
| Deterministic triage | Before any model call | Pure Python over a reviewed JSON corpus | Escalation |
| Constrained generation | During | Band-scoped prompt, retrieval restricted to the corpus | Refusal |
| Output guardrail | After every model call | `InterventionHandler.after_model_call` | Regeneration, then refusal |
| Action confirmation | Before any mother-facing tool | `InterventionHandler.before_tool_call` → `Confirm` | No action taken |

Nnneva does not diagnose, does not name conditions, does not estimate
probabilities, does not prescribe, and does not decide that something is fine.
The set of things it will say about a symptom is deliberately small: this is
common and here is what usually helps; this needs a health worker today; or this
needs a health worker right now. There is no fourth option, and no path by which
the language model can invent one.

## Running it

The frontend runs standalone against a seeded synthetic cohort — no backend and
no API keys required.

```bash
cd web
npm install
npm run dev     # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build |
| `npm test` | The red-flag triage suite and the inbound-path suite |
| `npm run lint` | ESLint |

**Open `/` first.** It opens on the sweep, not the chat — a process ran at 06:00
with nobody watching and reduced 40 mothers to 6.

To see the live escalation, open `/chat` and `/queue` side by side and send a
danger sign from her phone: the queue item appears in the console in the same
moment, ranked to the top.

See [`web/README.md`](web/README.md) for the full route map, the design system,
and how the safety layers map to the code.

## Data and privacy

This is health data about pregnant women, and the fact that it is a prototype
does not change what that requires. In this build:

- **No real patient data at any point.** The cohort is 42 fictional mothers
  generated from a fixed seed.
- **An explicit consent field on every mother record**, gating whether the sweep
  may include her at all — not merely what is displayed. Two of the 42 have not
  consented and are never reasoned about.
- **Data minimisation** — the sweep sees schedule position, silence, and recent
  triage history, not phone numbers or addresses.
- **An audit log** of every escalation, every blocked response, and every
  confirmed action.

## Clinical sources

The corpus is small, curated, and versioned in the repository as reviewable
JSON, derived from the WHO 2016 antenatal care recommendations, the WHO
essential-practice guide for pregnancy and childbirth (2015), and Nigeria's
Federal Ministry of Health national antenatal guidelines.

**It requires clinician review before any real deployment.** Every corpus file
carries a header naming its source and saying so. That header is not a
disclaimer — it is a statement about how the system is meant to be maintained.

## Licence

MIT. See [LICENSE](LICENSE).
