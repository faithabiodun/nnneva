#!/usr/bin/env bash
#
# The whole deploy, from a fresh AWS CloudShell, in one command:
#
#   ./deploy/cloudshell.sh
#
# It exists because the two scripts it calls assume things nothing in this
# repository creates — an S3 bucket for the build source and a CodeBuild
# project to build in — and because some settings only the running service
# knows have to be carried across. Getting SECRET_KEY wrong logs out every
# existing user, so it is read from the live service, never asked for.
#
# Safe to run twice. Everything here checks before it creates.

set -euo pipefail

# Exported, not just assigned: the child scripts and every `aws` call below
# need it. `export AWS_REGION` alone is a no-op when the variable is unset,
# which silently leaves region-less calls guessing.
export AWS_REGION="${AWS_REGION:-us-east-1}"
REGION="$AWS_REGION"

CLUSTER="${CLUSTER:-nnneva}"
SERVICE_NAME="${SERVICE_NAME:-nnneva-api}"
REPO="${ECR_REPO:-nnneva-api}"
PROJECT="${CODEBUILD_PROJECT:-nnneva-api-build}"
BUILD_ROLE="${BUILD_ROLE:-nnneva-codebuild}"

bold() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
info() { printf '    %s\n' "$*"; }
die()  { printf '\n\033[31mStopped:\033[0m %s\n\n' "$*" >&2; exit 1; }

# The live config holds DATABASE_URL and SECRET_KEY, so it goes somewhere only
# this process can read and is removed however the script exits.
LIVE_ENV=$(mktemp); chmod 600 "$LIVE_ENV"
cleanup() { rm -f "$LIVE_ENV"; }
trap cleanup EXIT

# ---- 1. Is this machine able to do the job at all? -------------------------

bold "Checking this shell"
for tool in aws zip git jq python3; do
  command -v "$tool" >/dev/null || die "\`$tool\` is not installed.
This expects AWS CloudShell, which has all of them. Somewhere else, install it
first — on Amazon Linux: sudo dnf install -y $tool"
done
ok "aws, zip, git, jq, python3"

ACCOUNT=$(aws sts get-caller-identity --region "$REGION" --query Account --output text 2>/dev/null) \
  || die "AWS credentials are not working here.
CloudShell needs no setup for this, so a failure means you are probably not in
it. Open: https://console.aws.amazon.com/cloudshell/home?region=us-east-1"
ok "account $ACCOUNT, region $REGION"

BUCKET="${BUILD_BUCKET:-nnneva-build-${ACCOUNT}}"

# ---- 2. Carry across what only the running service knows -------------------
#
# This is an ECS Express Gateway service. It has no task definition —
# describe-services returns None for one — so the live container config comes
# from describe-express-gateway-service, the same call the other scripts use.

bold "Reading the live service"

DESC=$(aws ecs describe-express-gateway-service --region "$REGION" \
  --cluster "$CLUSTER" --service-name "$SERVICE_NAME" 2>/dev/null || true)
[[ -n "$DESC" ]] || die "No service '$SERVICE_NAME' in cluster '$CLUSTER'.
Without it there is nothing to read DATABASE_URL and SECRET_KEY from, and
inventing a SECRET_KEY would log out every existing user. Check with:
  aws ecs describe-express-gateway-service --region $REGION --cluster $CLUSTER --service-name $SERVICE_NAME"

printf '%s' "$DESC" | jq -r '
  (.service.activeConfigurations // [])[0].primaryContainer.environment // []
  | map({(.name): .value}) | add // {}' > "$LIVE_ENV"

live() { jq -r --arg n "$1" '.[$n] // ""' "$LIVE_ENV"; }

# Secrets and identity: only the running service knows these, so they must
# survive. update-express-gateway-service replaces the environment wholesale,
# and the deploy script rebuilds it from its own inputs, so anything not
# re-exported here is dropped.
for name in DATABASE_URL SECRET_KEY WEB_ORIGIN SUPABASE_URL \
            OPENAI_API_KEY OPENAI_MODEL DEEPSEEK_API_KEY DEEPSEEK_MODEL \
            AWS_BEARER_TOKEN_BEDROCK; do
  value=$(live "$name")
  # Anything already set in this shell wins, so a deliberate override works.
  [[ -n "$value" && -z "${!name:-}" ]] && export "$name=$value"
done

# Deliberately NOT carried across: BEDROCK_MODEL_ID, BEDROCK_FALLBACK_MODEL_ID
# and MODEL_PRIORITY. The live values are the stale ones this deploy exists to
# replace — the running service still names a model Bedrock rejects at invoke
# time. Letting them survive would defeat the point, so the code's own
# defaults win unless you set them yourself.
for stale in BEDROCK_MODEL_ID BEDROCK_FALLBACK_MODEL_ID MODEL_PRIORITY; do
  was=$(live "$stale")
  [[ -n "$was" && -z "${!stale:-}" ]] && info "leaving behind $stale=$was"
done

[[ -n "${DATABASE_URL:-}" ]] || die "The live service has no DATABASE_URL to carry across."
[[ -n "${SECRET_KEY:-}"   ]] || die "The live service has no SECRET_KEY to carry across."
export WEB_ORIGIN="${WEB_ORIGIN:-https://nnneva.com}"

ok "SECRET_KEY carried across unchanged (${#SECRET_KEY} chars) — nobody gets logged out"
ok "DATABASE_URL carried across"
ok "WEB_ORIGIN $WEB_ORIGIN"
for optional in SUPABASE_URL OPENAI_API_KEY DEEPSEEK_API_KEY AWS_BEARER_TOKEN_BEDROCK; do
  [[ -n "${!optional:-}" ]] && ok "$optional carried across"
done

# ---- 3. A Bedrock API key, if one is sitting in the home directory ---------
#
# Not required: the ECS task role already carries Bedrock permission, and a
# role rotates itself where a key does not.

if [[ -z "${AWS_BEARER_TOKEN_BEDROCK:-}" ]]; then
  CSV=$(ls ~/*[Bb]edrock*.csv 2>/dev/null | head -1 || true)
  if [[ -n "$CSV" ]]; then
    KEY=$(awk -F, 'NR==2 {print $2}' "$CSV" | tr -d '\r\n')
    [[ -n "$KEY" ]] && export AWS_BEARER_TOKEN_BEDROCK="$KEY"
  fi
fi
if [[ -n "${AWS_BEARER_TOKEN_BEDROCK:-}" ]]; then
  ok "Bedrock API key (${#AWS_BEARER_TOKEN_BEDROCK} chars, starts ${AWS_BEARER_TOKEN_BEDROCK:0:4})"
else
  info "no Bedrock API key — the container uses its task role, the better default"
fi

# ---- 4. The things the build needs to exist --------------------------------

bold "Checking what the build needs"

aws ecr describe-repositories --repository-names "$REPO" --region "$REGION" >/dev/null 2>&1 \
  || { info "creating ECR repository $REPO"
       aws ecr create-repository --repository-name "$REPO" --region "$REGION" >/dev/null; }
ok "ECR repository $REPO"

if ! aws s3api head-bucket --bucket "$BUCKET" --region "$REGION" >/dev/null 2>&1; then
  info "creating s3://$BUCKET"
  # us-east-1 is the one region that rejects a LocationConstraint.
  if [[ "$REGION" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" >/dev/null
  else
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
      --create-bucket-configuration "LocationConstraint=$REGION" >/dev/null
  fi
  aws s3api put-public-access-block --bucket "$BUCKET" \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" >/dev/null
fi
ok "build bucket $BUCKET"

if ! aws codebuild batch-get-projects --names "$PROJECT" --region "$REGION" \
     --query 'projects[0].name' --output text 2>/dev/null | grep -qx "$PROJECT"; then
  info "creating CodeBuild project $PROJECT"

  if ! aws iam get-role --role-name "$BUILD_ROLE" >/dev/null 2>&1; then
    info "creating role $BUILD_ROLE"
    aws iam create-role --role-name "$BUILD_ROLE" \
      --description "Lets CodeBuild build the Nnneva API image and roll the service" \
      --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{
         "Effect":"Allow","Principal":{"Service":"codebuild.amazonaws.com"},
         "Action":"sts:AssumeRole"}]}' >/dev/null \
      || die "Not allowed to create the IAM role $BUILD_ROLE.
deploy/iam-policy.json scopes IAM to nnneva-ecs-* roles, so a deployer using it
cannot create this one. Either run this once as an administrator, or create the
CodeBuild project by hand and re-run — this script skips both if they exist."

    # Scoped to what api/buildspec.yml actually does. The two bucket-level
    # reads are easy to miss and fail the build in DOWNLOAD_SOURCE, before any
    # of the object-level grants are ever consulted.
    aws iam put-role-policy --role-name "$BUILD_ROLE" --policy-name build \
      --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[
        {\"Effect\":\"Allow\",\"Action\":[\"logs:CreateLogGroup\",\"logs:CreateLogStream\",\"logs:PutLogEvents\"],
         \"Resource\":\"arn:aws:logs:${REGION}:${ACCOUNT}:log-group:/aws/codebuild/${PROJECT}*\"},
        {\"Effect\":\"Allow\",\"Action\":[\"s3:GetBucketAcl\",\"s3:GetBucketLocation\"],
         \"Resource\":\"arn:aws:s3:::${BUCKET}\"},
        {\"Effect\":\"Allow\",\"Action\":[\"s3:GetObject\",\"s3:GetObjectVersion\"],
         \"Resource\":\"arn:aws:s3:::${BUCKET}/*\"},
        {\"Effect\":\"Allow\",\"Action\":\"ecr:GetAuthorizationToken\",\"Resource\":\"*\"},
        {\"Effect\":\"Allow\",\"Action\":[\"ecr:BatchCheckLayerAvailability\",\"ecr:CompleteLayerUpload\",
          \"ecr:InitiateLayerUpload\",\"ecr:PutImage\",\"ecr:UploadLayerPart\"],
         \"Resource\":\"arn:aws:ecr:${REGION}:${ACCOUNT}:repository/${REPO}\"},
        {\"Effect\":\"Allow\",\"Action\":[\"ecs:DescribeExpressGatewayService\",\"ecs:UpdateExpressGatewayService\"],
         \"Resource\":\"*\"}]}" >/dev/null
    info "waiting for the role to propagate"
    sleep 12
  fi

  # privilegedMode is required: the buildspec runs `docker build`.
  aws codebuild create-project --region "$REGION" --name "$PROJECT" \
    --source "type=S3,location=${BUCKET}/source/nnneva.zip,buildspec=api/buildspec.yml" \
    --artifacts "type=NO_ARTIFACTS" \
    --environment "type=LINUX_CONTAINER,image=aws/codebuild/amazonlinux-x86_64-standard:5.0,computeType=BUILD_GENERAL1_SMALL,privilegedMode=true" \
    --service-role "arn:aws:iam::${ACCOUNT}:role/${BUILD_ROLE}" >/dev/null \
    || die "Could not create the CodeBuild project. If this is a PassRole
refusal, deploy/iam-policy.json conditions iam:PassRole to ECS only; run this
once as an administrator."
fi
ok "CodeBuild project $PROJECT"

# ---- 5. Build, then deploy the exact image just built ----------------------
#
# One tag, set here and exported, so the two scripts cannot disagree: the build
# defaults to the commit sha and the deploy defaults to "latest", and letting
# each pick its own is how the wrong image gets shipped.

export IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"
bold "Building image tag $IMAGE_TAG"
./deploy/aws-codebuild.sh

bold "Deploying $IMAGE_TAG"
./deploy/aws-ecs-express.sh

# ---- 6. Say whether it actually worked -------------------------------------
#
# Against the API's own endpoint, not WEB_ORIGIN: that is the Next.js origin,
# used for CORS, and it serves no /health at all — polling it would report a
# 404 for five minutes whatever the deploy did.

bold "Checking the API"

API=$(aws ecs describe-express-gateway-service --region "$REGION" \
  --cluster "$CLUSTER" --service-name "$SERVICE_NAME" 2>/dev/null \
  | jq -r 'first((.service.activeConfigurations // [])[].ingressPaths[]?
           | select(.accessType == "PUBLIC" and .endpoint) | .endpoint) // ""')
[[ -n "$API" ]] || die "The service reports no public endpoint yet. Check:
  aws logs tail /ecs/${SERVICE_NAME} --since 15m"
API="https://${API#https://}"
info "$API/health"

BODY=""
for attempt in $(seq 1 30); do
  BODY=$(curl -fsS --max-time 10 "${API}/health" 2>/dev/null || true)
  [[ -n "$BODY" ]] && break
  # The first boot applies every pending migration before it serves, so a slow
  # start here is expected rather than a failure.
  [[ $attempt -eq 1 ]] && info "waiting (migrations run on first boot)"
  sleep 10
done

[[ -n "$BODY" ]] || die "The API never answered /health. It is deployed but not
serving — almost always a migration that failed on boot. The reason will be here:
  aws logs tail /ecs/${SERVICE_NAME} --since 15m | grep -iE 'error|alembic|traceback'"

echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
MODELS=$(echo "$BODY" | jq -r '(.models // []) | join(", ")' 2>/dev/null || true)
if [[ -n "$MODELS" ]]; then
  ok "models: $MODELS"
else
  warn "no models configured — the agent will answer from its built-in planner"
fi

bold "Done"
cat <<NOTE
The logs name the exact models in play:

  aws logs tail /ecs/${SERVICE_NAME} --since 15m | grep -E "Model router|Model:"
NOTE
