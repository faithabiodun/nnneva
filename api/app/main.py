"""The Nnneva API.

    web (Next.js) → FastAPI → Strands agent → tools → PostgreSQL

Every route is scoped to the signed-in user; there is no cross-user read
anywhere in the service.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.agent.models import describe
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
        "falls_back_to_scripted": not current.model_required,
        # Which providers will be attempted, in the order they are tried. A
        # provider missing from here is one that is configured off — which is
        # the first thing worth knowing when the agent is answering from the
        # scripted planner and nobody can see why.
        "providers": [
            name
            for name in current.provider_order
            if {
                "bedrock": current.use_bedrock_model,
                "deepseek": current.use_deepseek_model,
                "openai": current.use_openai_model,
            }[name]
        ],
        # The model ids behind those providers, same order.
        "models": describe(current),
    }
