# Nnneva

**Your maternal-care agent.** Nnneva takes the repetitive coordination work out
of pregnancy so mothers can focus on themselves and their baby.

It does not try to be a doctor. It remembers context, turns a goal stated in
plain language into tasks and reminders, acts through tools with confirmation
where confirmation is due, and escalates when a situation needs a professional.

> Remember · Plan · Act · Monitor · Escalate

## Repository layout

| Path | What it is |
| --- | --- |
| `web/` | Next.js + Tailwind front end |
| `api/` | FastAPI service, the Strands agent, and its tools |

## Architecture

```
        Nnneva web app (Next.js)
                  │
                  ▼
             FastAPI API
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
   Strands agent        PostgreSQL
        │                   ▲
   ┌────┼────┐              │
   ▼    ▼    ▼              │
Memory Planner Safety ──────┘
        │
        ▼
      Tools
   ┌────┼──────────┐
   ▼    ▼          ▼
 Tasks Reminders  Appointment prep
```

## Running it

Front end:

```bash
cd web && npm install && npm run dev      # http://localhost:3000
```

API and agent:

```bash
cd api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                      # DATABASE_URL + AWS credentials
uvicorn app.main:app --reload --port 8000 # http://localhost:8000/docs
```

## Guardrails

These are product requirements, not disclaimers:

- No diagnosis, no prescription, no replacement of clinical judgement.
- No consequential external action without the user's confirmation.
- Nothing shared with a trusted contact unless the user permits it explicitly.
- Every meaningful agent action is visible in an activity history.
- When a potential emergency is detected, normal automation stops and safe
  escalation takes priority.

## Licence

MIT. See [LICENSE](LICENSE).
