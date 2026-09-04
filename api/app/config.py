"""Runtime configuration, read from the environment (see .env.example)."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://nnneva:nnneva@localhost:5432/nnneva"

    # Which planner runs:
    #   auto     — use Bedrock when credentials are present, fall back on failure
    #   bedrock  — require Bedrock; a failure is a 502, never a silent fallback
    #   scripted — never call a model
    # The fallback (app/agent/scripted.py) drives the same tools against the
    # same database, so the product works end to end without AWS.
    agent_engine: Literal["auto", "bedrock", "scripted"] = "auto"

    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    bedrock_model_id: str = "anthropic.claude-opus-5"

    # Signs session tokens. Generate one with:
    #   python -c "import secrets; print(secrets.token_urlsafe(48))"
    secret_key: str = "change-me"
    access_token_ttl_hours: int = 24 * 14

    web_origin: str = "http://localhost:3000"

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
    def use_bedrock(self) -> bool:
        if self.agent_engine == "scripted":
            return False
        if self.agent_engine == "bedrock":
            return True
        return self.has_aws_credentials

    @property
    def bedrock_required(self) -> bool:
        """In `bedrock` mode a failure surfaces instead of falling back."""
        return self.agent_engine == "bedrock"


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
