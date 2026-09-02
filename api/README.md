# Nnneva API

FastAPI service fronting the Strands agent and PostgreSQL, per §09 and §11 of
the product blueprint.

```
web (Next.js)  →  FastAPI  →  Strands agent  →  tools  →  PostgreSQL
```

## Running it

```bash
cd api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in DATABASE_URL and AWS credentials
uvicorn app.main:app --reload --port 8000
```

The API is documented at `/docs` once running.
