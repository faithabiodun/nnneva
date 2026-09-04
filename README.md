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

Each half has its own README with the detail.

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

Two processes and a PostgreSQL database. Start the API first — the web app
fetches from it during rendering.

**1. The API and agent**

```bash
cd api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(48))"   # SECRET_KEY

createdb nnneva
alembic upgrade head
python -m app.seed                        # optional demo account, see below

uvicorn app.main:app --reload --port 8000 # http://localhost:8000/docs
```

AWS credentials are optional. Without them the agent uses a deterministic
planner that drives the same tools against the same database — see
[`api/README.md`](api/README.md).

**2. The web app**

```bash
cd web
npm install
cp .env.example .env.local                # API_BASE_URL, defaults to :8000
npm run dev                               # http://localhost:3000
```

The seed creates `faith@example.com` / `nnneva-demo-2026` with a pregnancy in
progress and one real agent run already recorded.

## How the two halves connect

The browser never holds an API token. Sign-in happens in a Server Action, which
puts the token in an httpOnly cookie; every API call is then made from a server
component or a server action with that cookie attached. `web/lib/api.ts` is
marked `server-only`, so importing it from a client component is a build error
rather than a leak.

```
browser ──▶ Next.js server ──(bearer token)──▶ FastAPI ──▶ agent ──▶ PostgreSQL
   ▲              │
   └── httpOnly ──┘
```

## Deploying

```
   web (Next.js)          API (FastAPI + Strands)        data
   ─────────────          ───────────────────────        ────
   Pxxl             ──▶   Pxxl or ECS Express     ──▶   Pxxl Postgres
                            │                            (or any managed)
                            └──▶ Bedrock
```

### The API — Amazon ECS Express Mode

App Runner closed to new customers on 30 April 2026. Express Mode is AWS's named
replacement: it provisions the load balancer, target group, security groups, TLS
certificate and autoscaling policy itself, so there is no VPC wiring and no ALB
to pay for separately.

It runs a container image, so deployment is two steps. The first needs Docker;
the second needs only the AWS CLI.

The deploying identity needs the permissions in
[`deploy/iam-policy.json`](deploy/iam-policy.json) — the exact set these two
scripts call, nothing more. IAM is scoped to `nnneva-ecs-*` and `PassRole` is
conditioned to ECS, so the keys cannot hand those roles to anything else.

```bash
# 1. Build and push. From a machine with a Docker daemon.
./deploy/push-image.sh

# 2. Deploy. From anywhere.
export DATABASE_URL="postgresql+psycopg://..."
export SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
export WEB_ORIGIN="https://your-web-app"
./deploy/aws-ecs-express.sh
```

The deploy creates three IAM roles with distinct jobs — infrastructure (lets ECS
manage the load balancer), execution (lets the agent pull the image and write
logs), and task (what the running container may do: invoke Bedrock) — then the
cluster, log group and service, and waits for a public endpoint before printing
it. It is idempotent: re-run it to roll out a new image.

**No AWS key is ever set on the service.** Bedrock access comes from the task
role. The only secrets the deploy handles are `DATABASE_URL` and `SECRET_KEY`,
both read from your shell.

It sets `AGENT_ENGINE=bedrock` rather than `auto` deliberately. `auto` decides by
looking for explicit access keys, and a role-based deployment has none, so `auto`
would quietly serve the rule-based planner. `bedrock` fails loudly.

The image runs `alembic upgrade head` on boot. That is fine for one task; past a
single instance, move it to a one-off invocation or concurrent starts race for
the version table.

### The database — Pxxl Postgres

Any managed Postgres works. Pxxl provisions one directly:

```bash
pxxl db create --name nnneva-db --type postgres
pxxl db get nnneva-db          # prints Database URL, user, password, host, port
```

Take the **Database URL** row and swap `postgresql://` for
`postgresql+psycopg://` so SQLAlchemy uses psycopg 3. That is the only edit the
URL needs. Then create the schema from any machine that can reach the database:

```bash
cd api
export DATABASE_URL="postgresql+psycopg://..."
alembic upgrade head
```

Set the same `DATABASE_URL` as an environment variable on the API service.

If you use Supabase instead, note that it grants its `anon` and `authenticated` roles
full access to every table in `public` by default, so anyone holding the
publishable key could read every password hash and pregnancy profile. Nnneva
does not use PostgREST — it connects directly as the owning role — so migration
`3a1810805e49` revokes those grants, blocks future ones, and enables RLS on
every table. It is a no-op on a database without those roles.

### The web app — Pxxl

`web/pxxl.toml` and `web/.pxxlignore` are committed:

```bash
npm install -g @pxxlapp/pxxl
pxxl login --api-key <your key>
cd web && pxxl deploy
```

Set `API_BASE_URL` in the Pxxl dashboard to the deployed API's URL. It is
deliberately not in the repo: `.env*` is excluded from the upload, and the local
value points at `localhost:8000`.

### The API on Pxxl — worth one attempt

The Pxxl CLI cannot *detect* a Python project. Its `detectFramework` knows only
JavaScript frameworks and `.php`, and `detectRuntime` returns exactly one of
`php`, `node` or `static`; nothing in the CLI mentions `requirements.txt`,
`uvicorn` or `gunicorn`.

But detection is only a fallback. `language`, `installCommand`, `buildCommand`,
`startCommand`, `entryFile` and `port` are read from `pxxl.toml` and forwarded
to the builder verbatim — the CLI never checks them against its own lists. So
[`api/pxxl.toml`](api/pxxl.toml) asks the builder for Python directly:

```bash
cd api && pxxl deploy
```

Whether that works depends on the Pxxl builder, not on the CLI, so it is a
question only a real deploy answers. If the builder rejects `language =
"python"`, the API needs a host with a Python runtime — ECS Express Mode above,
or any Python host — and only the web app stays on Pxxl.

## Guardrails

These are product requirements, not disclaimers:

- No diagnosis, no prescription, no replacement of clinical judgement.
- No consequential external action without the user's confirmation.
- Nothing shared with a trusted contact unless the user permits it explicitly.
- Every meaningful agent action is visible in an activity history.
- When a potential emergency is detected, normal automation stops and safe
  escalation takes priority.

They are enforced in code, not in a prompt. The red-flag screen runs on the raw
message before any model sees it; a message it flags produces no tasks even when
the user explicitly asks for one. `api/tests/` covers each rule case by case.

## Licence

MIT. See [LICENSE](LICENSE).
