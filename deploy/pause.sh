#!/usr/bin/env bash
#
# Stop Nnneva costing money, and start it again later.
#
#   ./deploy/pause.sh status    what exists, and which parts cost while idle
#   ./deploy/pause.sh pause     stop the running ones
#   ./deploy/pause.sh resume    bring them back
#
# Nothing here deletes data. Every account, task and message lives in Supabase,
# which is billed separately and is not touched by any of this — pausing AWS
# does not pause that side.
#
# Nor does it touch the domain. The Route 53 hosted zone is about $0.50 a
# month and deleting it refunds nothing while throwing away every DNS record,
# which is a bad trade at that price.

set -euo pipefail

export AWS_REGION="${AWS_REGION:-us-east-1}"
REGION="$AWS_REGION"
CLUSTER="${CLUSTER:-nnneva}"
SERVICE_NAME="${SERVICE_NAME:-nnneva-api}"
PIPELINE="${PIPELINE:-nnneva}"
LOG_RETENTION_DAYS="${LOG_RETENTION_DAYS:-14}"

bold() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
info() { printf '    %s\n' "$*"; }
die()  { printf '\n\033[31mStopped:\033[0m %s\n\n' "$*" >&2; exit 1; }

ACTION="${1:-status}"
case "$ACTION" in status|pause|resume) ;; *)
  die "Use: $0 [status|pause|resume]" ;;
esac

command -v aws >/dev/null || die "The AWS CLI is not here. Use CloudShell:
https://console.aws.amazon.com/cloudshell/home?region=us-east-1"
aws sts get-caller-identity --region "$REGION" >/dev/null 2>&1 \
  || die "AWS credentials are not working in this shell."

# ---- Find the service ------------------------------------------------------
#
# Errors are shown rather than swallowed. An older CLI has no
# list-express-gateway-services, and hiding that makes a running service look
# like an empty account — which is the most expensive possible way to be wrong.

bold "Looking for the service"

SERVICE_ARN=$(aws ecs describe-express-gateway-service --region "$REGION" \
  --cluster "$CLUSTER" --service-name "$SERVICE_NAME" \
  --query 'service.serviceArn' --output text 2>/tmp/ecs-err || true)

if [[ -z "$SERVICE_ARN" || "$SERVICE_ARN" == "None" ]]; then
  ERR=$(cat /tmp/ecs-err 2>/dev/null || true); rm -f /tmp/ecs-err
  if grep -qi "Invalid choice\|argument operation" <<<"$ERR"; then
    die "This AWS CLI does not know Express Gateway services, so it cannot see
or stop yours. CloudShell's CLI is current; update with:
  pip install --upgrade --user awscli"
  fi
  warn "no service '$SERVICE_NAME' in cluster '$CLUSTER'"
  [[ -n "$ERR" ]] && info "$(head -2 <<<"$ERR")"
  info "nothing to pause here — it is already costing nothing"
  SERVICE_ARN=""
else
  rm -f /tmp/ecs-err
  DESC=$(aws ecs describe-express-gateway-service --region "$REGION" \
    --cluster "$CLUSTER" --service-name "$SERVICE_NAME")
  STATE=$(jq -r '.service.status.statusCode // "?"' <<<"$DESC")
  MIN=$(jq -r '.service.scalingTarget.minTaskCount // "?"' <<<"$DESC")
  MAX=$(jq -r '.service.scalingTarget.maxTaskCount // "?"' <<<"$DESC")
  ok "$SERVICE_NAME — $STATE, scaling $MIN..$MAX tasks"
  info "this is nearly all of the bill: Fargate tasks plus a load balancer,"
  info "charged by the hour whether or not anyone visits"
fi

# ---- Act -------------------------------------------------------------------

case "$ACTION" in

status)
  bold "The rest"
  if aws codepipeline get-pipeline --name "$PIPELINE" --region "$REGION" >/dev/null 2>&1; then
    ok "CodePipeline $PIPELINE — about \$1/month while it exists"
  else
    info "no pipeline named $PIPELINE"
  fi
  ZONES=$(aws route53 list-hosted-zones --query 'HostedZones[].Name' --output text 2>/dev/null || true)
  [[ -n "$ZONES" ]] && ok "hosted zones: $ZONES (about \$0.50/month each — keep them)"
  REPOS=$(aws ecr describe-repositories --region "$REGION" \
    --query 'repositories[].repositoryName' --output text 2>/dev/null || true)
  [[ -n "$REPOS" ]] && ok "ECR: $REPOS (pennies, and what makes resuming one command)"
  info ""
  info "CodeBuild and S3 cost nothing while idle — CodeBuild bills per build minute."
  printf '\n  Run \033[1m%s pause\033[0m to stop the running parts.\n\n' "$0"
  ;;

pause)
  [[ -n "$SERVICE_ARN" ]] && {
    bold "Pausing $SERVICE_NAME"
    # Zero first: it keeps the service, and with it the endpoint that DNS and
    # CloudFront already point at. Deleting would free the same money and then
    # hand back a different URL to re-point afterwards.
    if aws ecs update-express-gateway-service --region "$REGION" \
         --service-arn "$SERVICE_ARN" \
         --scaling-target '{"minTaskCount":0,"maxTaskCount":1,"autoScalingMetric":"AVERAGE_CPU","autoScalingTargetValue":70}' \
         >/dev/null 2>/tmp/scale-err; then
      ok "scaled to zero tasks — the endpoint survives, so resuming changes no DNS"
    else
      warn "it will not scale to zero: $(head -1 /tmp/scale-err 2>/dev/null)"
      info "Express Mode may require at least one task. The only real pause is"
      info "then to delete the service, which frees the same money but returns a"
      info "NEW endpoint on resume, so whatever points nnneva.com at it needs"
      info "updating. Nothing else is lost — deploy/aws-ecs-express.sh recreates it."
      info ""
      info "  aws ecs delete-express-gateway-service --region $REGION --service-arn $SERVICE_ARN"
    fi
    rm -f /tmp/scale-err
  }

  if aws codepipeline get-pipeline --name "$PIPELINE" --region "$REGION" >/dev/null 2>&1; then
    bold "Stopping the pipeline from running"
    STAGE=$(aws codepipeline get-pipeline --name "$PIPELINE" --region "$REGION" \
      --query 'pipeline.stages[1].name' --output text 2>/dev/null || true)
    if [[ -n "$STAGE" && "$STAGE" != "None" ]]; then
      aws codepipeline disable-stage-transition --region "$REGION" \
        --pipeline-name "$PIPELINE" --stage-name "$STAGE" \
        --transition-type Inbound \
        --reason "Paused by deploy/pause.sh" >/dev/null 2>&1 \
        && ok "transition into '$STAGE' disabled — pushes no longer trigger a build" \
        || warn "could not disable the transition into '$STAGE'"
    fi
  fi

  bold "Trimming log retention"
  for group in "/ecs/${SERVICE_NAME}" "/aws/codebuild/${SERVICE_NAME}-build"; do
    aws logs put-retention-policy --region "$REGION" \
      --log-group-name "$group" --retention-in-days "$LOG_RETENTION_DAYS" >/dev/null 2>&1 \
      && ok "$group kept for ${LOG_RETENTION_DAYS} days" || true
  done

  bold "Paused"
  cat <<NOTE
  Supabase is NOT paused — your data lives there and it bills separately.
  Pause it at https://supabase.com/dashboard if you want that stopped too.

  To start again:  $0 resume
NOTE
  ;;

resume)
  if [[ -z "$SERVICE_ARN" ]]; then
    bold "The service is gone, so resuming means recreating it"
    cat <<NOTE
  deploy/cloudshell.sh does the whole thing, including the build:

      ./deploy/cloudshell.sh

  It reads DATABASE_URL and SECRET_KEY off the live service — which no longer
  exists — so you will need them from your notes or the Supabase dashboard.
  Reuse the old SECRET_KEY or every existing user is logged out.
NOTE
    exit 0
  fi

  bold "Resuming $SERVICE_NAME"
  aws ecs update-express-gateway-service --region "$REGION" \
    --service-arn "$SERVICE_ARN" \
    --scaling-target '{"minTaskCount":1,"maxTaskCount":3,"autoScalingMetric":"AVERAGE_CPU","autoScalingTargetValue":70}' \
    >/dev/null
  ok "scaling back to 1..3 tasks"

  if aws codepipeline get-pipeline --name "$PIPELINE" --region "$REGION" >/dev/null 2>&1; then
    STAGE=$(aws codepipeline get-pipeline --name "$PIPELINE" --region "$REGION" \
      --query 'pipeline.stages[1].name' --output text 2>/dev/null || true)
    [[ -n "$STAGE" && "$STAGE" != "None" ]] && \
      aws codepipeline enable-stage-transition --region "$REGION" \
        --pipeline-name "$PIPELINE" --stage-name "$STAGE" \
        --transition-type Inbound >/dev/null 2>&1 \
      && ok "pipeline transitions re-enabled" || true
  fi

  bold "Coming up"
  info "give it a couple of minutes, then check:"
  info "  aws logs tail /ecs/${SERVICE_NAME} --since 5m"
  ;;
esac
