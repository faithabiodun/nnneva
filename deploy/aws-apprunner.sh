#!/usr/bin/env bash
#
# Deploy the Nnneva API to AWS App Runner.
#
#   ./deploy/aws-apprunner.sh
#
# App Runner builds the service straight from GitHub with its managed Python
# runtime, so there is no Dockerfile, no image registry and no build host to
# maintain — §09's "keep deployment boring" rule.
#
# Bedrock access comes from an IAM instance role, not from access keys in the
# service's environment. The only secrets this script handles are DATABASE_URL
# and SECRET_KEY, and both arrive from your shell rather than from the repo.
#
# Prerequisites
#   - AWS credentials with IAM + App Runner permissions
#   - A GitHub connection in App Runner (one-time, console-only: App Runner →
#     GitHub connections → Add new. The OAuth handshake cannot be scripted.)
#   - DATABASE_URL and SECRET_KEY exported

set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
SERVICE_NAME="${SERVICE_NAME:-nnneva-api}"
REPO_URL="${REPO_URL:-https://github.com/faithabiodun/nnneva}"
BRANCH="${BRANCH:-main}"
ROLE_NAME="${ROLE_NAME:-nnneva-apprunner-instance}"
MODEL_ID="${BEDROCK_MODEL_ID:-anthropic.claude-opus-5}"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
die() { printf '\nError: %s\n' "$*" >&2; exit 1; }

# ---- Preconditions -------------------------------------------------------

command -v aws >/dev/null || die "The AWS CLI is not installed."
[[ -n "${DATABASE_URL:-}" ]] || die "Export DATABASE_URL (the Supabase connection string)."
[[ -n "${SECRET_KEY:-}" ]] || die "Export SECRET_KEY. Generate one with:
  python -c \"import secrets; print(secrets.token_urlsafe(48))\""
[[ ${#SECRET_KEY} -ge 32 ]] || die "SECRET_KEY must be at least 32 characters."
[[ -n "${WEB_ORIGIN:-}" ]] || die "Export WEB_ORIGIN (the deployed web app's origin, for CORS)."

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null) \
  || die "AWS credentials are not valid. Check AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY."
say "Account $ACCOUNT_ID, region $REGION"

# ---- The GitHub connection (one-time, console-created) --------------------

CONNECTION_ARN=$(aws apprunner list-connections --region "$REGION" \
  --query "ConnectionSummaryList[?Status=='AVAILABLE']|[0].ConnectionArn" --output text)

if [[ -z "$CONNECTION_ARN" || "$CONNECTION_ARN" == "None" ]]; then
  die "No AVAILABLE App Runner GitHub connection found in $REGION.
Create one in the console (App Runner → GitHub connections → Add new), complete
the GitHub authorisation, then re-run. The OAuth handshake cannot be scripted."
fi
say "Using GitHub connection: $CONNECTION_ARN"

# ---- Instance role: how the running service reaches Bedrock ---------------
#
# Scoped to invoking one model family. No key material anywhere.

if ! aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  say "Creating IAM instance role $ROLE_NAME"
  aws iam create-role --role-name "$ROLE_NAME" \
    --description "Lets the Nnneva App Runner service invoke Bedrock" \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "tasks.apprunner.amazonaws.com"},
        "Action": "sts:AssumeRole"
      }]
    }' >/dev/null
else
  say "Reusing IAM instance role $ROLE_NAME"
fi

aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name bedrock-invoke \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Effect\": \"Allow\",
      \"Action\": [\"bedrock:InvokeModel\", \"bedrock:InvokeModelWithResponseStream\"],
      \"Resource\": [
        \"arn:aws:bedrock:${REGION}::foundation-model/anthropic.*\",
        \"arn:aws:bedrock:${REGION}:${ACCOUNT_ID}:inference-profile/*\"
      ]
    }]
  }" >/dev/null

ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

# ---- The service ----------------------------------------------------------
#
# AGENT_ENGINE is set to bedrock rather than auto on purpose. `auto` decides by
# looking for explicit access keys, and there are none here — credentials come
# from the instance role — so `auto` would quietly serve the rule-based planner.
# `bedrock` fails loudly instead, which is what you want in production.

SOURCE=$(cat <<JSON
{
  "CodeRepository": {
    "RepositoryUrl": "${REPO_URL}",
    "SourceCodeVersion": {"Type": "BRANCH", "Value": "${BRANCH}"},
    "SourceDirectory": "api",
    "CodeConfiguration": {
      "ConfigurationSource": "API",
      "CodeConfigurationValues": {
        "Runtime": "PYTHON_311",
        "BuildCommand": "pip install -r requirements.txt",
        "StartCommand": "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000",
        "Port": "8000",
        "RuntimeEnvironmentVariables": {
          "AGENT_ENGINE": "bedrock",
          "BEDROCK_MODEL_ID": "${MODEL_ID}",
          "AWS_REGION": "${REGION}",
          "WEB_ORIGIN": "${WEB_ORIGIN}"
        },
        "RuntimeEnvironmentSecrets": {}
      }
    }
  },
  "AutoDeploymentsEnabled": true,
  "AuthenticationConfiguration": {"ConnectionArn": "${CONNECTION_ARN}"}
}
JSON
)

# DATABASE_URL and SECRET_KEY are merged in here rather than written into the
# heredoc above, so neither can end up in a shell trace or a log line.
SOURCE=$(DB="$DATABASE_URL" SK="$SECRET_KEY" python3 - "$SOURCE" <<'PY'
import json, os, sys
cfg = json.loads(sys.argv[1])
env = cfg["CodeRepository"]["CodeConfiguration"]["CodeConfigurationValues"]["RuntimeEnvironmentVariables"]
env["DATABASE_URL"] = os.environ["DB"]
env["SECRET_KEY"] = os.environ["SK"]
print(json.dumps(cfg))
PY
)

EXISTING=$(aws apprunner list-services --region "$REGION" \
  --query "ServiceSummaryList[?ServiceName=='${SERVICE_NAME}']|[0].ServiceArn" --output text)

if [[ -n "$EXISTING" && "$EXISTING" != "None" ]]; then
  say "Updating existing service $SERVICE_NAME"
  ARN=$(aws apprunner update-service --region "$REGION" \
    --service-arn "$EXISTING" \
    --source-configuration "$SOURCE" \
    --instance-configuration "{\"Cpu\":\"1 vCPU\",\"Memory\":\"2 GB\",\"InstanceRoleArn\":\"${ROLE_ARN}\"}" \
    --query 'Service.ServiceArn' --output text)
else
  say "Creating service $SERVICE_NAME"
  ARN=$(aws apprunner create-service --region "$REGION" \
    --service-name "$SERVICE_NAME" \
    --source-configuration "$SOURCE" \
    --instance-configuration "{\"Cpu\":\"1 vCPU\",\"Memory\":\"2 GB\",\"InstanceRoleArn\":\"${ROLE_ARN}\"}" \
    --health-check-configuration '{"Protocol":"HTTP","Path":"/health","Interval":10,"Timeout":5,"HealthyThreshold":1,"UnhealthyThreshold":5}' \
    --query 'Service.ServiceArn' --output text)
fi

say "Waiting for $SERVICE_NAME to come up (first build takes a few minutes)"
for _ in $(seq 1 60); do
  STATUS=$(aws apprunner describe-service --region "$REGION" --service-arn "$ARN" \
    --query 'Service.Status' --output text)
  printf '  %s\n' "$STATUS"
  [[ "$STATUS" == "RUNNING" ]] && break
  [[ "$STATUS" == CREATE_FAILED || "$STATUS" == OPERATION_IN_PROGRESS_FAILED ]] && \
    die "Deployment failed. Logs: aws apprunner list-operations --service-arn $ARN"
  sleep 15
done

URL=$(aws apprunner describe-service --region "$REGION" --service-arn "$ARN" \
  --query 'Service.ServiceUrl' --output text)

say "Live at https://${URL}"
printf '  health   https://%s/health\n  docs     https://%s/docs\n\n' "$URL" "$URL"
printf 'Set API_BASE_URL=https://%s on the web app, then redeploy it.\n' "$URL"
