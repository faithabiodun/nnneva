#!/usr/bin/env bash
#
# The whole deploy, from a fresh AWS CloudShell, in one command:
#
#   ./deploy/cloudshell.sh
#
# It exists because the two scripts it calls assume things that nothing in this
# repository creates — an S3 bucket for the build source and a CodeBuild
# project to build in — and because the settings the service already runs with
# have to be carried forward rather than retyped. Getting SECRET_KEY wrong logs
# out every existing user, so it is read from the running service, never asked
# for.
#
# Safe to run twice. Everything here checks before it creates.

set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
CLUSTER="${CLUSTER:-nnneva}"
SERVICE_NAME="${SERVICE_NAME:-nnneva-api}"
REPO="${ECR_REPO:-nnneva-api}"
PROJECT="${CODEBUILD_PROJECT:-nnneva-api-build}"
BUILD_ROLE="${BUILD_ROLE:-nnneva-codebuild}"

export AWS_REGION

bold() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
info() { printf '    %s\n' "$*"; }
die()  { printf '\n\033[31mStopped:\033[0m %s\n\n' "$*" >&2; exit 1; }

# ---- 1. Is this machine able to do the job at all? -------------------------

bold "Checking this shell"
for tool in aws zip git jq; do
  command -v "$tool" >/dev/null || die "\`$tool\` is not installed.
This script expects AWS CloudShell, which has all of them. If you are somewhere
else, install it first — on Amazon Linux: sudo dnf install -y $tool"
done
ok "aws, zip, git, jq"

ACCOUNT=$(aws sts get-caller-identity --query Account --output text 2>/dev/null) \
  || die "AWS credentials are not working here.
In CloudShell this needs no setup, so if it fails you are probably not in
CloudShell. Open: https://console.aws.amazon.com/cloudshell/home?region=us-east-1"
ok "account $ACCOUNT, region $REGION"

BUCKET="${BUILD_BUCKET:-nnneva-build-${ACCOUNT}}"

# ---- 2. The things the build needs to exist --------------------------------

bold "Checking what the build needs"

aws ecr describe-repositories --repository-names "$REPO" --region "$REGION" >/dev/null 2>&1 \
  || { info "creating ECR repository $REPO"
       aws ecr create-repository --repository-name "$REPO" --region "$REGION" >/dev/null; }
ok "ECR repository $REPO"

if ! aws s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1; then
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
         "Action":"sts:AssumeRole"}]}' >/dev/null
    # Narrow to what the buildspec actually does: read the source, write logs,
    # push the image, and roll the one service.
    aws iam put-role-policy --role-name "$BUILD_ROLE" --policy-name build \
      --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[
        {\"Effect\":\"Allow\",\"Action\":[\"logs:CreateLogGroup\",\"logs:CreateLogStream\",\"logs:PutLogEvents\"],
         \"Resource\":\"arn:aws:logs:${REGION}:${ACCOUNT}:log-group:/aws/codebuild/${PROJECT}*\"},
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
    --service-role "arn:aws:iam::${ACCOUNT}:role/${BUILD_ROLE}" >/dev/null
fi
ok "CodeBuild project $PROJECT"

# ---- 3. Carry the running settings forward ---------------------------------

bold "Reading the settings the service runs with now"

TASK_DEF=$(aws ecs describe-services --cluster "$CLUSTER" --services "$SERVICE_NAME" \
  --region "$REGION" --query 'services[0].taskDefinition' --output text 2>/dev/null || true)
[[ -n "$TASK_DEF" && "$TASK_DEF" != "None" ]] \
  || die "No running service '$SERVICE_NAME' in cluster '$CLUSTER'.
Without it there is nothing to read DATABASE_URL and SECRET_KEY from, and
inventing a SECRET_KEY would log out every existing user."

aws ecs describe-task-definition --task-definition "$TASK_DEF" --region "$REGION" \
  --query 'taskDefinition.containerDefinitions[0].environment' --output json > /tmp/nnneva-env.json

read_env() { jq -r --arg n "$1" '.[]|select(.name==$n)|.value' /tmp/nnneva-env.json; }

export DATABASE_URL=$(read_env DATABASE_URL)
export SECRET_KEY=$(read_env SECRET_KEY)
export WEB_ORIGIN=$(read_env WEB_ORIGIN)
export SUPABASE_URL=$(read_env SUPABASE_URL)

[[ -n "$DATABASE_URL" ]] || die "The running service has no DATABASE_URL to carry forward."
[[ -n "$SECRET_KEY"   ]] || die "The running service has no SECRET_KEY to carry forward."
[[ -n "$WEB_ORIGIN"   ]] || export WEB_ORIGIN="https://nnneva.com"

ok "DATABASE_URL, SECRET_KEY carried forward (${#SECRET_KEY} chars, unchanged)"
ok "WEB_ORIGIN $WEB_ORIGIN"
[[ -n "$SUPABASE_URL" ]] && ok "SUPABASE_URL carried forward" || info "no SUPABASE_URL — Google sign-in stays off"

# ---- 4. A Bedrock API key, only if one is offered --------------------------
#
# Not required. The ECS task role already carries Bedrock permission, and a
# role rotates itself where a key does not. This is here for the case where
# the role turns out not to work.

if [[ -z "${AWS_BEARER_TOKEN_BEDROCK:-}" ]]; then
  CSV=$(ls ~/*bedrock*api*key*.csv ~/*Bedrock*.csv 2>/dev/null | head -1 || true)
  if [[ -n "$CSV" ]]; then
    export AWS_BEARER_TOKEN_BEDROCK=$(awk -F, 'NR==2 {print $2}' "$CSV" | tr -d '\r\n')
  fi
fi
if [[ -n "${AWS_BEARER_TOKEN_BEDROCK:-}" ]]; then
  ok "Bedrock API key found (${#AWS_BEARER_TOKEN_BEDROCK} chars, starts ${AWS_BEARER_TOKEN_BEDROCK:0:4})"
else
  info "no Bedrock API key — the container will use its task role, which is the better default"
fi

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

bold "Checking the deploy"
HEALTH="${WEB_ORIGIN%/}/health"
for attempt in $(seq 1 30); do
  BODY=$(curl -fsS --max-time 10 "$HEALTH" 2>/dev/null || true)
  if [[ -n "$BODY" ]]; then
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    MODELS=$(echo "$BODY" | jq -r '.models // [] | join(", ")' 2>/dev/null || true)
    [[ -n "$MODELS" ]] && ok "models: $MODELS" \
      || info "no models listed — the agent will answer from its built-in planner"
    break
  fi
  # The first boot applies every pending migration before serving, so a slow
  # start here is expected rather than a failure.
  [[ $attempt -eq 1 ]] && info "waiting for the new task (migrations run on first boot)"
  sleep 10
done

printf '\n'
bold "Done"
cat <<'NOTE'
If anything looked wrong above, the logs say why:

  aws logs tail /ecs/nnneva-api --since 15m | grep -E "Model router|alembic|ERROR"

The line beginning "Model router:" names the exact models in play.
NOTE
