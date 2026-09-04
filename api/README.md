# Nnneva API

The backend from §09–§11 of the product blueprint: a FastAPI service in front
of a Strands agent and PostgreSQL.

```
web (Next.js)  →  FastAPI  →  Strands agent  →  tools  →  PostgreSQL
```

## Running it

```bash
cd api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env          # then fill in DATABASE_URL and SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(48))"   # for SECRET_KEY

createdb nnneva               # or point DATABASE_URL at an existing one
alembic upgrade head
python -m app.seed            # optional: one user with a pregnancy in progress

uvicorn app.main:app --reload --port 8000
```

`/docs` carries the full API. `/health` reports how the agent is configured.

The service needs `DATABASE_URL` and `SECRET_KEY` and nothing else. AWS
credentials are optional — see below.

## The agent

Nine tools, each one a plain function in `app/agent/tools.py`:

| Tool | What it does |
| --- | --- |
| `get_user_context` | Reads due date, stage, clinic, clinician, memories, open tasks, next appointments |
| `safety_check` | Screens a message for obstetric red flags and records the result |
| `create_task` / `update_task` | Creates and changes real tasks under a goal |
| `schedule_reminder` | Schedules a reminder against a task |
| `create_appointment` | Records a visit the user names, defaulting place and clinician from her profile |
| `create_appointment_preparation` | Saves questions and preparation items for the next visit |
| `save_memory` | Stores a fact so the user never repeats her context |
| `share_with_contact` | **Never sends.** Raises an approval and stops |

The blueprint lists eight tools. `create_appointment` is the ninth, and it was
missing: the blueprint's own opening line — "I have an antenatal appointment
next Thursday" — has to leave something behind, or the agent prepares for a
visit it has no record of and quietly saves nothing.

The blueprint also lists `log_agent_action`. There is no such tool: every call
is recorded automatically at the tool boundary (`Toolbox.record`), so the
activity history is complete by construction rather than dependent on a model
remembering to log.

### Two engines, one tool set

`AGENT_ENGINE` decides which planner runs:

| Value | Behaviour |
| --- | --- |
| `auto` (default) | Use Bedrock when AWS credentials are present; fall back to the deterministic planner if the call fails |
| `bedrock` | Require Bedrock. A failure returns **502**, never a silent fallback |
| `scripted` | Never call a model |

The fallback (`app/agent/scripted.py`) is not a mock. It calls the same tools,
writes the same rows, and goes through the same safety screen and approval
gate — only the *planning* is rules instead of a model. It exists so the product
works end to end for anyone cloning the repo without an AWS account, and so a
throttled model is never the reason a demo shows nothing.

Every run records which engine produced it, and the API returns that in the
run's `engine` field. Nothing here is ever presented as model output when it
was not. Use `AGENT_ENGINE=bedrock` when you need to be certain the model ran.

A failed Bedrock attempt is rolled back inside a savepoint before the fallback
starts, so a model that calls three tools and then dies does not leave that work
behind for the fallback to repeat.

## The safety layer

Three points of control, in `app/agent/safety.py`:

1. **Before the model.** `screen()` runs on the raw message. It is a rule set,
   not a prompt, so no phrasing talks it out of firing. `same_day` and
   `emergency` stop task automation for that turn entirely — she can ask for a
   task and, correctly, not get one.
2. **The system prompt** (`app/agent/prompt.py`), which makes the safe path the
   natural one.
3. **After the model.** `scrub()` blocks named conditions offered as
   conclusions, doses, probability claims, and false reassurance, and replaces
   the whole response rather than editing it — a paragraph with the diagnosis
   removed still reads as though one was reached.

On the Bedrock path the spine is also enforced at the tool boundary: once the
screen has stopped automation, a `BeforeToolCallEvent` hook cancels every tool
except the two that read or record. A model that decides to create tasks anyway
is stopped in code, not asked nicely in a prompt.

Cleared screens are recorded too — proving a message was checked and found
clear is part of the guarantee.

## Data

Ten models from §04, in `app/models.py`:

```
User → PregnancyProfile → Goals → Plans → Tasks
                        ↘ Appointments → Questions / Preparation
                        ↘ Reminders
                        ↘ Memories
                        ↘ AgentRuns → ToolActions
                        ↘ SafetyEvents
```

Plus `TrustedContact` and `Approval`, which carry the two guarantees the
blueprint is most specific about: nothing reaches another person without an
explicit answer, every time.

Migrations are Alembic; `alembic/env.py` reads `DATABASE_URL` from the app
settings so there is one source of truth for where the database lives.

## Deploying

Two scripts, because they need different things. `../deploy/push-image.sh` builds
the image and pushes it to ECR, and needs a Docker daemon.
`../deploy/aws-ecs-express.sh` deploys it to Amazon ECS Express Mode, and needs
only the AWS CLI.

Express Mode is AWS's replacement for App Runner, which closed to new customers
on 30 April 2026. It manages the load balancer, TLS and autoscaling itself.

Bedrock access comes from the ECS task role rather than access keys in the
environment, and the deploy sets `AGENT_ENGINE=bedrock` because `auto` only
recognises explicit keys and would otherwise fall back to the rule-based planner
without saying so.

Required environment when deployed: `DATABASE_URL`, `SECRET_KEY` (≥32 bytes),
and `WEB_ORIGIN` so CORS admits the web app.

The `Dockerfile` builds from AWS's ECR Public mirror of the official Python image
rather than Docker Hub, which rate-limits anonymous pulls per source IP and fails
builds on shared CI egress. `push-image.sh` builds `linux/amd64` explicitly:
Fargate runs x86_64 unless configured otherwise, and an arm64 image built on
Apple Silicon starts, dies with an exec format error, and surfaces as a failing
health check that never mentions architecture.

Migration `3a1810805e49` matters on managed Postgres that ships `anon` and
`authenticated` roles, such as Supabase: it revokes their default grants on
`public`, blocks future ones, and enables RLS on every table. Without it anyone
holding the publishable key can read every password hash and pregnancy profile.
The API is unaffected — it connects as the role that owns the tables, and owners
bypass RLS. On a database without those roles the revokes are skipped and only
RLS is applied.

## Tests

```bash
pytest
```

82 tests against a real PostgreSQL database (`TEST_DATABASE_URL`, default
`nnneva_test`) rather than SQLite — the app uses Postgres enums and
`NULLS LAST` ordering, and an in-memory stand-in would pass tests the real
deployment fails.

They cover the red-flag rule set case by case, the output guardrail in both
directions, the core workflow from §05 end to end, the approval gate (approve,
decline, and answering twice), cross-user isolation, and each engine mode
including the savepoint rollback.
