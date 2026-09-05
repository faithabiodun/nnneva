#!/usr/bin/env bash
#
# Build the API image without a local Docker daemon.
#
#   ./deploy/aws-codebuild.sh
#
# push-image.sh needs Docker and unrestricted registry access. This does not:
# it uploads api/ to S3 and has CodeBuild build and push the image from inside
# AWS, where pulls from public.ecr.aws are neither rate-limited by source IP nor
# subject to a restricted network's egress rules.
#
# Use this when `docker build` cannot reach a registry CDN, or when there is no
# Docker daemon at all. Otherwise push-image.sh is fewer moving parts.

set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
REPO="${ECR_REPO:-nnneva-api}"
TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)}"
PROJECT="${CODEBUILD_PROJECT:-nnneva-api-build}"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
die() { printf '\nError: %s\n' "$*" >&2; exit 1; }

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text) \
  || die "AWS credentials are not valid."
BUCKET="${BUILD_BUCKET:-nnneva-build-${ACCOUNT_ID}}"

say "Packaging api/"
ZIP=$(mktemp -d)/nnneva-api.zip
# Tests, caches and local env never belong in the image context.
( cd api && zip -qr "$ZIP" . \
    -x '.venv/*' '__pycache__/*' '*/__pycache__/*' '*.pyc' \
       '.pytest_cache/*' '.env' 'tests/*' )
printf '  %s\n' "$(du -h "$ZIP" | cut -f1)"

say "Uploading to s3://${BUCKET}/source/nnneva-api.zip"
aws s3 cp "$ZIP" "s3://${BUCKET}/source/nnneva-api.zip" --region "$REGION" >/dev/null

say "Starting build $PROJECT"
BUILD_ID=$(aws codebuild start-build --region "$REGION" \
  --project-name "$PROJECT" \
  --environment-variables-override "name=IMAGE_TAG,value=${TAG},type=PLAINTEXT" \
  --query 'build.id' --output text)
printf '  %s\n' "$BUILD_ID"

say "Waiting"
while :; do
  STATUS=$(aws codebuild batch-get-builds --region "$REGION" --ids "$BUILD_ID" \
    --query 'builds[0].buildStatus' --output text)
  [[ "$STATUS" == "IN_PROGRESS" ]] || break
  sleep 10
done

[[ "$STATUS" == "SUCCEEDED" ]] || die "Build $STATUS. Logs:
  aws logs tail /aws/codebuild/${PROJECT} --region ${REGION} --follow"

say "Pushed ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO}:${TAG}"
printf '\nNow deploy it:\n  IMAGE_TAG=%s ./deploy/aws-ecs-express.sh\n' "$TAG"
