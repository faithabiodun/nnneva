"""Runtime configuration, read from the environment (see .env.example)."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://nnneva:nnneva@localhost:5432/nnneva"

    # Which planner runs:
    #   auto     — call a model when one is configured, fall back on failure
    #   model    — require a model; a failure is a 502, never a silent fallback
    #   bedrock  — the old name for "model", still accepted so a deployment
    #              already carrying AGENT_ENGINE=bedrock keeps working
    #   scripted — never call a model
    # The fallback (app/agent/scripted.py) drives the same tools against the
    # same database, so the product works end to end without any provider.
    agent_engine: Literal["auto", "model", "bedrock", "scripted"] = "auto"

    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    # On-demand Anthropic models on Bedrock are reachable only through a
    # regional inference profile, hence the "us." prefix. A bare
    # "anthropic.claude-..." id is accepted here and rejected at invoke time.
    bedrock_model_id: str = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"

    # The second provider, tried when Bedrock fails. Empty disables it, which
    # is the default: nothing here calls OpenAI unless a key is supplied.
    openai_api_key: str = ""
    openai_model: str = "gpt-5.3-mini"

    # Signs session tokens. Generate one with:
    #   python -c "import secrets; print(secrets.token_urlsafe(48))"
    secret_key: str = "change-me"
    access_token_ttl_hours: int = 24 * 14

    web_origin: str = "http://localhost:3000"

    # Google sign-in, brokered by Supabase Auth. Supabase owns the OAuth
    # redirect and holds the Google client secret; this API only verifies the
    # access token Supabase issues. Empty disables the route.
    supabase_url: str = ""

    # Only for projects still signing with a shared secret. Modern projects use
    # asymmetric keys published at /auth/v1/.well-known/jwks.json and need
    # nothing here. Which one a project uses cannot be told from the outside,
    # so both paths exist; see app/supabase_auth.py.
    supabase_jwt_secret: str = ""

    @property
    def supabase_auth_enabled(self) -> bool:
        return bool(self.supabase_url)

    @property
    def has_aws_credentials(self) -> bool:
        """Whether explicit AWS access keys were supplied to the process.

        Presence is not reachability — keys can be present and still be
        rejected by Bedrock — so this only decides whether it is worth trying.

        It deliberately does not consult boto3's wider credential chain. That
        means a deployment whose credentials come from an IAM role rather than
        keys (App Runner, ECS, EC2) reads as "no credentials" here, so
        AGENT_ENGINE must be set to "bedrock" explicitly there. deploy/
        aws-apprunner.sh does exactly that. Probing the chain instead would
        make startup wait on an instance-metadata timeout on every machine
        that has no credentials at all, including developer laptops and CI.
        """
        return bool(self.aws_access_key_id and self.aws_secret_access_key)

    @property
    def has_openai_key(self) -> bool:
        return bool(self.openai_api_key)

    @property
    def model_forced(self) -> bool:
        """Configured to insist on a model rather than decide by what is present."""
        return self.agent_engine in ("model", "bedrock")

    @property
    def use_bedrock_model(self) -> bool:
        """Whether Bedrock is worth building as a candidate.

        Forced mode counts as yes even with no keys, because that is how a task
        running under an IAM role reaches Bedrock — the role is invisible here.
        """
        return self.agent_engine != "scripted" and (
            self.has_aws_credentials or self.model_forced
        )

    @property
    def use_openai_model(self) -> bool:
        """OpenAI needs a key; there is no ambient-credential equivalent."""
        return self.agent_engine != "scripted" and self.has_openai_key

    @property
    def use_model(self) -> bool:
        return self.use_bedrock_model or self.use_openai_model

    @property
    def model_required(self) -> bool:
        """In forced mode a failure surfaces instead of falling back."""
        return self.model_forced


MIN_SECRET_BYTES = 32  # HMAC-SHA256's block size; anything shorter weakens the signature


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.secret_key == "change-me":
        raise RuntimeError(
            "SECRET_KEY is still the placeholder. Generate one with:\n"
            '  python -c "import secrets; print(secrets.token_urlsafe(48))"'
        )
    if len(settings.secret_key.encode()) < MIN_SECRET_BYTES:
        raise RuntimeError(
            f"SECRET_KEY must be at least {MIN_SECRET_BYTES} bytes; "
            f"this one is {len(settings.secret_key.encode())}."
        )
    return settings
