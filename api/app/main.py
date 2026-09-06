"""The Nnneva API.

    web (Next.js) → FastAPI → Strands agent → tools → PostgreSQL

Every route is scoped to the signed-in user; there is no cross-user read
anywhere in the service.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import (
    activity,
    agent,
    appointments,
    approvals,
    auth,
    home,
    memory,
    onboarding,
    partner,
    people,
    profile,
    tasks,
)

logging.basicConfig(level=logging.INFO)

# Read once for the middleware, which is fixed at startup. Everything that
# can change is resolved per request instead.
settings = get_settings()

app = FastAPI(
    title="Nnneva API",
    version="0.1.0",
    summary="The maternal-care agent's backend: goals in, real work out.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.web_origin.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (
    auth, onboarding, home, agent, tasks, appointments, activity, memory, profile, approvals,
    partner, people,
):
    app.include_router(module.router)


@app.get("/health", tags=["meta"])
def health() -> dict[str, object]:
    """Liveness and how the agent is configured.

    `mode` is what was asked for; `will_try_bedrock` is what will actually be
    attempted. Whether a given run reached the model is on the run itself, in
    its `engine` field — presence of credentials is not reachability.
    """
    # Resolved per call rather than read at import, so the endpoint reports the
    # configuration the next run will actually use.
    current = get_settings()
    return {
        "status": "ok",
        "mode": current.agent_engine,
        "will_try_bedrock": current.use_bedrock_model,
        "will_try_openai": current.use_openai_model,
        "falls_back_to_scripted": not current.model_required,
        "bedrock_model": current.bedrock_model_id if current.use_bedrock_model else None,
        "openai_model": current.openai_model if current.use_openai_model else None,
    }
