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
    # A Bedrock API key, as generated in the Bedrock console. botocore reads
    # this env var itself and signs with it instead of SigV4, so nothing here
    # passes it anywhere — it only needs to be *noticed*, so that `auto` mode
    # knows Bedrock is worth attempting.
    #
    # It is account-wide, not per-model: what it can invoke is decided by the
    # permissions of the identity it was minted for, not by the key.
    aws_bearer_token_bedrock: str = ""
    # Both verified against a real account with a Converse call, including
    # tool use — not chosen from a catalogue listing, which proves nothing.
    #
    # gpt-oss is served on demand, so it needs no inference profile. Anthropic
    # models on this account return "Model use case details have not been
    # submitted"; once that form is filled in, us.anthropic.claude-haiku-4-5-
    # 20251001-v1:0 becomes available and is the cheaper choice.
    bedrock_model_id: str = "openai.gpt-oss-120b-1:0"
    # Tried when the one above does not answer — throttled, or not enabled on
    # the account. It needs no extra credentials, which is what makes it
    # useful: a fallback that works today rather than one waiting on a key
    # from somewhere else. Set it empty to run on a single Bedrock model.
    bedrock_fallback_model_id: str = "minimax.minimax-m2.5"
    # Ask Bedrock which ids this account can actually invoke, and swap the
    # ones above for the matching model it really has. Off means the
    # configured strings are used exactly as written.
    bedrock_discover: bool = True

    # The second provider, tried when Bedrock fails. Empty disables it, which
    # is the default: nothing here calls OpenAI unless a key is supplied.
    openai_api_key: str = ""
    openai_model: str = "gpt-5.3-mini"

    # DeepSeek, reached through its OpenAI-compatible endpoint.
    #
    # `deepseek-chat` is an alias DeepSeek keeps pointed at its current model
    # rather than a version string that goes stale. Prefer it to naming a
    # release: a wrong id here fails at call time, not at startup, which is
    # the failure mode that cost this project days already.
    deepseek_api_key: str = ""
    deepseek_model: str = "deepseek-chat"
    deepseek_base_url: str = "https://api.deepseek.com"

    # Which providers to try, in order. The first that answers wins; a
    # provider that keeps failing sinks below the healthier ones.
    #
    # Bedrock leads by default because it runs inside this account's own AWS,
    # so nothing about a pregnancy leaves it. Putting a third party first is a
    # deliberate choice, which is why it takes an explicit setting.
    model_priority: str = "bedrock,deepseek,openai"

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
        """Whether something usable for Bedrock was handed to this process.

        Either a pair of access keys or a Bedrock API key: botocore accepts
        the bearer token in place of SigV4 signing, so a deployment carrying
        only that one is as ready to call Bedrock as one carrying keys.

        Presence is not reachability — either can be present and still be
        rejected — so this only decides whether it is worth trying.

        It deliberately does not consult boto3's wider credential chain. That
        means a deployment whose credentials come from an IAM role rather than
        keys (App Runner, ECS, EC2) reads as "no credentials" here, so
        AGENT_ENGINE must be set explicitly there, which the deploy script
        does. Probing the chain instead would make startup wait on an
        instance-metadata timeout on every machine that has none at all,
        including developer laptops and CI.
        """
        keys = bool(self.aws_access_key_id and self.aws_secret_access_key)
        return keys or bool(self.aws_bearer_token_bedrock)

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
    def use_deepseek_model(self) -> bool:
        return self.agent_engine != "scripted" and bool(self.deepseek_api_key)

    @property
    def provider_order(self) -> list[str]:
        """The configured order, keeping only names this build knows."""
        known = {"bedrock", "deepseek", "openai"}
        wanted = [p.strip().lower() for p in self.model_priority.split(",") if p.strip()]
        seen: list[str] = []
        for name in wanted:
            if name in known and name not in seen:
                seen.append(name)
        # Anything left out of the setting still goes last rather than being
        # silently dropped: a typo should not disable a configured provider.
        return seen + [n for n in ("bedrock", "deepseek", "openai") if n not in seen]

    @property
    def use_model(self) -> bool:
        return self.use_bedrock_model or self.use_deepseek_model or self.use_openai_model

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
