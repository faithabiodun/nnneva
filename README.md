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
   Pxxl or Vercel   ──▶   AWS App Runner          ──▶   Postgres
                            │                            (managed)
                            └──▶ Bedrock (IAM role)
```

### The API — AWS App Runner

`deploy/aws-apprunner.sh` does the whole thing. App Runner builds straight from
GitHub with its managed Python runtime, so there is no Dockerfile, no image
registry and no build host.

```bash
export DATABASE_URL="postgresql+psycopg://..."   # managed Postgres
export SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
export WEB_ORIGIN="https://your-web-app"         # for CORS
./deploy/aws-apprunner.sh
```

The script creates a scoped IAM instance role so the running service reaches
Bedrock **without any access keys in its environment**, sets a `/health` check,
runs `alembic upgrade head` on each release, and waits for the service to come
up before printing the URL. It is idempotent: run it again to update.

One step it cannot do for you is the App Runner **GitHub connection** — that is
an OAuth handshake, so create it once in the console (App Runner → GitHub
connections → Add new) and the script will find it.

It sets `AGENT_ENGINE=bedrock` rather than `auto` deliberately. `auto` decides
by looking for explicit access keys, and a role-based deployment has none, so
`auto` would quietly serve the rule-based planner. `bedrock` fails loudly.

### The database

Any managed Postgres. Take the connection string and swap `postgresql://` for
`postgresql+psycopg://` so SQLAlchemy uses psycopg 3.

If you use Supabase, note that it grants its `anon` and `authenticated` roles
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

Set `API_BASE_URL` in the Pxxl dashboard to the App Runner URL. It is
deliberately not in the repo: `.env*` is excluded from the upload, and the local
value points at `localhost:8000`.

The Pxxl CLI has no Python runtime — it detects `nextjs`, `vite`, `astro`, `go`
and `static`, with no reference to `requirements.txt`, `uvicorn` or `gunicorn`
anywhere in it — which is why the API goes to AWS instead.

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
