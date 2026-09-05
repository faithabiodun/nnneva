#!/usr/bin/env bash
#
# Deploy the Nnneva API to Amazon ECS Express Mode.
#
#   export DATABASE_URL=... SECRET_KEY=... WEB_ORIGIN=...
#   export GOOGLE_CLIENT_ID=...     # optional; omit to leave Google sign-in off
#   ./deploy/aws-ecs-express.sh
#
# Express Mode is AWS's named replacement for App Runner, which closed to new
# customers on 30 April 2026. It provisions the load balancer, target group,
# security groups, TLS certificate and autoscaling policy itself, so this script
# creates three IAM roles, a log group and the service, and nothing else.
#
# The image must already be in ECR — run deploy/push-image.sh first, from a
# machine with Docker.
#
# Bedrock access comes from the task role, so no AWS key is ever set on the
# service. Only DATABASE_URL and SECRET_KEY are secrets here, and both arrive
# from your shell rather than from the repository.

set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
SERVICE_NAME="${SERVICE_NAME:-nnneva-api}"
CLUSTER="${CLUSTER:-nnneva}"
REPO="${ECR_REPO:-nnneva-api}"
TAG="${IMAGE_TAG:-latest}"
MODEL_ID="${BEDROCK_MODEL_ID:-anthropic.claude-opus-5}"
LOG_GROUP="/ecs/${SERVICE_NAME}"

INFRA_ROLE="${INFRA_ROLE:-nnneva-ecs-infrastructure}"
EXEC_ROLE="${EXEC_ROLE:-nnneva-ecs-execution}"
TASK_ROLE="${TASK_ROLE:-nnneva-ecs-task}"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
die() { printf '\nError: %s\n' "$*" >&2; exit 1; }

# ---- Preconditions --------------------------------------------------------

command -v aws >/dev/null || die "The AWS CLI is not installed."
[[ -n "${DATABASE_URL:-}" ]] || die "Export DATABASE_URL (the managed Postgres connection string)."
[[ -n "${SECRET_KEY:-}" ]] || die "Export SECRET_KEY. Generate one with:
  python -c \"import secrets; print(secrets.token_urlsafe(48))\""
[[ ${#SECRET_KEY} -ge 32 ]] || die "SECRET_KEY must be at least 32 characters."
[[ -n "${WEB_ORIGIN:-}" ]] || die "Export WEB_ORIGIN (the web app's origin, for CORS)."

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null) \
  || die "AWS credentials are not valid. Check AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY."
IMAGE="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO}:${TAG}"

say "Account $ACCOUNT_ID, region $REGION"

aws ecr describe-images --region "$REGION" --repository-name "$REPO" \
  --image-ids "imageTag=${TAG}" >/dev/null 2>&1 \
  || die "No image tagged '${TAG}' in ECR repository '${REPO}'.
Build and push it first, from a machine with Docker:
  ./deploy/push-image.sh"

say "Deploying image ${IMAGE}"

# ---- Roles ----------------------------------------------------------------
#
# Three, with different jobs:
#   infrastructure — lets ECS create the load balancer and friends for you
#   execution      — lets the agent pull the image and write logs
#   task           — what the running container itself can do: invoke Bedrock

ensure_role() {  # name, trust-service, description
  local name="$1" service="$2" description="$3"
  if aws iam get-role --role-name "$name" >/dev/null 2>&1; then
    printf '  reusing %s\n' "$name"
    return
  fi
  printf '  creating %s\n' "$name"
  aws iam create-role --role-name "$name" --description "$description" \
    --assume-role-policy-document "{
      \"Version\": \"2012-10-17\",
      \"Statement\": [{
        \"Effect\": \"Allow\",
        \"Principal\": {\"Service\": \"${service}\"},
        \"Action\": \"sts:AssumeRole\"
      }]
    }" >/dev/null
}

say "IAM roles"
ensure_role "$INFRA_ROLE" "ecs.amazonaws.com" \
  "Lets ECS Express Mode manage load balancing and scaling for Nnneva"
aws iam attach-role-policy --role-name "$INFRA_ROLE" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSInfrastructureRoleforExpressGatewayServices

ensure_role "$EXEC_ROLE" "ecs-tasks.amazonaws.com" \
  "Lets the ECS agent pull the Nnneva image and write logs"
aws iam attach-role-policy --role-name "$EXEC_ROLE" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

ensure_role "$TASK_ROLE" "ecs-tasks.amazonaws.com" \
  "What the running Nnneva container may do: invoke Bedrock"
aws iam put-role-policy --role-name "$TASK_ROLE" --policy-name bedrock-invoke \
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

INFRA_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${INFRA_ROLE}"
EXEC_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${EXEC_ROLE}"
TASK_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${TASK_ROLE}"

# A freshly created role is not immediately assumable everywhere. Without this
# the first deploy of a new account fails with "unable to assume role" and
# succeeds on a retry, which is a confusing way to learn about IAM propagation.
say "Waiting for IAM propagation"
sleep 12

# ---- Cluster and logs ------------------------------------------------------

say "Cluster and log group"
aws ecs describe-clusters --region "$REGION" --clusters "$CLUSTER" \
  --query 'clusters[0].status' --output text 2>/dev/null | grep -q ACTIVE \
  || aws ecs create-cluster --region "$REGION" --cluster-name "$CLUSTER" >/dev/null
printf '  cluster %s\n' "$CLUSTER"

aws logs describe-log-groups --region "$REGION" --log-group-name-prefix "$LOG_GROUP" \
  --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -qx "$LOG_GROUP" \
  || aws logs create-log-group --region "$REGION" --log-group-name "$LOG_GROUP" >/dev/null
printf '  logs %s\n' "$LOG_GROUP"

# ---- The service -----------------------------------------------------------
#
# AGENT_ENGINE is bedrock rather than auto deliberately. `auto` decides by
# looking for explicit access keys, and there are none here — credentials come
# from the task role — so `auto` would quietly serve the rule-based planner.
# `bedrock` fails loudly, which is what production should do.
#
# The container image already runs `alembic upgrade head` on boot. With more
# than one task that becomes a race for the version table; move it to a one-off
# invocation before scaling past a single instance.

CONTAINER=$(DB="$DATABASE_URL" SK="$SECRET_KEY" WO="$WEB_ORIGIN" \
  GCID="${GOOGLE_CLIENT_ID:-}" \
  IMG="$IMAGE" LG="$LOG_GROUP" MODEL="$MODEL_ID" RG="$REGION" python3 - <<'PY'
import json, os

environment = [
    {"name": "AGENT_ENGINE",      "value": "bedrock"},
    {"name": "BEDROCK_MODEL_ID",  "value": os.environ["MODEL"]},
    {"name": "AWS_REGION",        "value": os.environ["RG"]},
    {"name": "WEB_ORIGIN",        "value": os.environ["WO"]},
    {"name": "DATABASE_URL",      "value": os.environ["DB"]},
    {"name": "SECRET_KEY",        "value": os.environ["SK"]},
]

# Google sign-in is optional. An empty entry is not the same as an absent one:
# it would let a deploy that simply forgot the variable look deliberate.
if os.environ.get("GCID"):
    environment.append({"name": "GOOGLE_CLIENT_ID", "value": os.environ["GCID"]})

print(json.dumps({
    "image": os.environ["IMG"],
    "containerPort": 8000,
    "awsLogsConfiguration": {
        "logGroup": os.environ["LG"],
        "logStreamPrefix": "api",
    },
    "environment": environment,
}))
PY
)

SCALING='{"minTaskCount":1,"maxTaskCount":3,"autoScalingMetric":"AVERAGE_CPU","autoScalingTargetValue":70}'

# Update is addressed by ARN, not by cluster plus name the way describe and
# create are, so the existing service has to be looked up first.
EXISTING_ARN=$(aws ecs describe-express-gateway-service --region "$REGION" \
  --cluster "$CLUSTER" --service-name "$SERVICE_NAME" \
  --query 'service.serviceArn' --output text 2>/dev/null || true)

if [[ -n "$EXISTING_ARN" && "$EXISTING_ARN" != "None" ]]; then
  say "Updating $SERVICE_NAME"
  aws ecs update-express-gateway-service --region "$REGION" \
    --service-arn "$EXISTING_ARN" \
    --primary-container "$CONTAINER" \
    --cpu 1024 --memory 2048 \
    --health-check-path /health \
    --scaling-target "$SCALING" \
    --task-role-arn "$TASK_ARN" \
    --execution-role-arn "$EXEC_ARN" >/dev/null
else
  say "Creating $SERVICE_NAME"
  aws ecs create-express-gateway-service --region "$REGION" \
    --cluster "$CLUSTER" --service-name "$SERVICE_NAME" \
    --infrastructure-role-arn "$INFRA_ARN" \
    --execution-role-arn "$EXEC_ARN" \
    --task-role-arn "$TASK_ARN" \
    --primary-container "$CONTAINER" \
    --cpu 1024 --memory 2048 \
    --health-check-path /health \
    --scaling-target "$SCALING" >/dev/null
fi

# ---- Wait, then report ------------------------------------------------------

say "Waiting for the service to come up (the first deploy builds a load balancer)"
ENDPOINT=""
for _ in $(seq 1 80); do
  DESC=$(aws ecs describe-express-gateway-service --region "$REGION" \
    --cluster "$CLUSTER" --service-name "$SERVICE_NAME" 2>/dev/null || true)
  [[ -z "$DESC" ]] && { sleep 15; continue; }

  STATUS=$(printf '%s' "$DESC" | python3 -c "import json,sys; print(json.load(sys.stdin)['service']['status'].get('statusCode',''))" 2>/dev/null || true)
  ENDPOINT=$(printf '%s' "$DESC" | python3 -c "
import json, sys
svc = json.load(sys.stdin)['service']
for cfg in svc.get('activeConfigurations') or []:
    for path in cfg.get('ingressPaths') or []:
        if path.get('accessType') == 'PUBLIC' and path.get('endpoint'):
            print(path['endpoint']); raise SystemExit
" 2>/dev/null || true)

  printf '  %s%s\n' "${STATUS:-provisioning}" "${ENDPOINT:+  →  $ENDPOINT}"
  [[ "$STATUS" == "ACTIVE" && -n "$ENDPOINT" ]] && break
  sleep 15
done

[[ -n "$ENDPOINT" ]] || die "The service did not report a public endpoint in time.
Check it with:
  aws ecs describe-express-gateway-service --region $REGION --cluster $CLUSTER --service-name $SERVICE_NAME
  aws logs tail $LOG_GROUP --follow"

URL="https://${ENDPOINT#https://}"
say "Live at ${URL}"
printf '  health   %s/health\n  docs     %s/docs\n  logs     aws logs tail %s --follow\n\n' \
  "$URL" "$URL" "$LOG_GROUP"
printf 'Set API_BASE_URL=%s on the web app, then redeploy it.\n' "$URL"
