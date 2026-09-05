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
   Pxxl             ──▶   ECS Express Mode        ──▶   Postgres
                            │  (image from ECR)          (Pxxl, Supabase,
                            └──▶ Bedrock (task role)      RDS — any managed)
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
export SUPABASE_URL="https://<ref>.supabase.co"            # optional
./deploy/aws-ecs-express.sh
```

`SUPABASE_URL` is optional and omitted from the task definition entirely
when unset, rather than sent as an empty string — so a deploy that forgot it
looks absent rather than deliberate. Everything else is required and the script
refuses to run without it.

**If you have no Docker daemon**, step 1 also runs unchanged in **AWS
CloudShell** (Console → the terminal icon): it has Docker and the AWS CLI, is
already authenticated as you, and builds inside AWS, so neither Docker Hub
rate limits nor a restricted network gets in the way. Clone the repo there and
run the same script.

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

### The database

Any managed Postgres works — RDS, Supabase, or Pxxl. Pxxl is the quickest to
provision and needs no VPC wiring to reach from Express Mode:

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

**On Supabase, use the Session pooler connection string, not the direct one.**
Direct connections (`db.<ref>.supabase.co:5432`) resolve to IPv6 only unless the
project has the IPv4 add-on, and a Fargate task without IPv6 cannot reach them —
which surfaces as a connection timeout on boot, not as anything mentioning
addresses. The Session pooler is IPv4 and speaks the full protocol.

Avoid the *Transaction* pooler (port 6543) unless you also disable prepared
statements: psycopg 3 prepares by default and PgBouncer in transaction mode
cannot hold those between statements. The Session pooler has no such problem.

Note also that Supabase grants its `anon` and `authenticated` roles
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

### Alternative: the API on Pxxl

AWS is the supported path above. This is kept because it puts the whole stack
on one platform if it works.

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

## Google sign-in

Optional, and brokered by **Supabase Auth** rather than by talking to Google
directly. With `SUPABASE_URL` unset the button still renders and explains it is
not configured, and `POST /auth/supabase` returns 501.

Supabase holds the Google client secret in its provider settings, so no Google
credential appears in this repo or in either tier's environment. Adding a second
provider later is a dashboard toggle, not more code here.

The work is split so that no tier has to trust another:

1. `/auth/google` (web) generates a PKCE verifier, sends only its SHA-256 hash,
   and redirects to Supabase, which runs the Google consent screen.
2. `/auth/callback` (web) exchanges the returned code for a Supabase access
   token, using the verifier held in a ten-minute httpOnly cookie. An
   intercepted code is worthless without it.
3. `POST /auth/supabase` (API) **verifies that token itself** — signature,
   issuer, expiry, and `aud` pinned to `authenticated`. It does not accept an
   email the web tier merely asserts; if it did, anything that could reach the
   API could sign in as anyone.
4. The API finds or creates the user and returns an ordinary Nnneva session
   token, which becomes the same httpOnly cookie the password flow sets.

Supabase signs tokens either asymmetrically (current default, public keys at
`/auth/v1/.well-known/jwks.json`, nothing secret needed) or with a shared
secret (legacy). Which one a project uses cannot be determined from outside, so
both are supported: leave `SUPABASE_JWT_SECRET` blank for a modern project, set
it for a legacy one.

Accounts created this way have `password_hash = NULL`. A placeholder hash would
have been worse — one known string would open every such account through the
password form — so `verify_password` returns False before reaching bcrypt.
Signing in with Google using an address that already has a password account
signs into that account and leaves its password intact.

## Continuous deployment

A push to `main` rebuilds and redeploys both apps. No manual step.

```
GitHub push → CodePipeline → CodeBuild (api) ─┐
                           → CodeBuild (web) ─┴→ ECS Express services
```

The pipeline is `nnneva` in `us-east-1`; its source is a CodeStar connection to
this repository, so a push starts it within seconds rather than waiting on a
poll.

Each build rolls its own service at the end of `post_build` rather than handing
off to a CodePipeline ECS deploy action. That action calls `UpdateService`,
which does not apply to Express Gateway services — they have their own
`UpdateExpressGatewayService` API. The deploy step reads the service's current
container definition and changes only the image, so environment variables and
secrets set outside the pipeline are carried forward rather than reset.

Two things that are easy to get wrong here, both learned the hard way:

- `UpdateExpressGatewayService` registers a task definition revision internally,
  so the build role needs `ecs:RegisterTaskDefinition`. Without it the failure
  names the *task definition*, not the service, which reads like the wrong
  problem.
- CodeBuild's bundled boto3 predates Express Mode, so the buildspec pins a newer
  one rather than trusting the image.

Configuration lives in SSM Parameter Store under `/nnneva/` (API) and
`/nnneva/web/` (web), injected as container secrets. Nothing sensitive is in a
task definition, and changing a value needs no rebuild — update the parameter
and roll the service.

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
