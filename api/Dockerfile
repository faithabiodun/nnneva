# Nnneva API.
#
# Built here rather than by the platform so the artefact that runs in production
# is the one that was tested. App Runner, ECS and anything else that takes an
# OCI image will run this unchanged.

# AWS's mirror of the official image rather than Docker Hub directly: Hub rate
# limits anonymous pulls per source IP, which fails builds on shared CI egress.
FROM public.ecr.aws/docker/library/python:3.11-slim AS base

# psycopg 3 needs libpq at runtime. Build tooling is not installed: every pinned
# dependency ships a manylinux wheel, and if that ever stops being true the
# build should fail loudly rather than quietly compile from source.
RUN apt-get update \
 && apt-get install --no-install-recommends -y libpq5 \
 && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Dependencies are their own layer, so application edits do not reinstall them.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app

# Runs unprivileged. Nothing in the image is written to at runtime.
RUN useradd --system --create-home --uid 10001 nnneva \
 && chown -R nnneva:nnneva /app
USER nnneva

EXPOSE 8000

# Migrations run on boot. Fine for a single instance; with several, run
# `alembic upgrade head` once as a release step and drop it from here, or
# concurrent instances will race for the version table.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
