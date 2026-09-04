#!/usr/bin/env bash
#
# Build the API image and push it to ECR.
#
#   ./deploy/push-image.sh
#
# Run this from a machine with a Docker daemon. It is separate from the deploy
# because the two have different requirements: this needs Docker and unrestricted
# registry access, the deploy needs neither.
#
# Re-run it whenever the API changes, then re-run deploy/aws-ecs-express.sh to
# roll the new image out.

set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
REPO="${ECR_REPO:-nnneva-api}"
TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)}"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
die() { printf '\nError: %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null || die "Docker is not installed."
docker info >/dev/null 2>&1 || die "The Docker daemon is not running."

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text) \
  || die "AWS credentials are not valid."
REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

say "Ensuring the ECR repository exists"
aws ecr describe-repositories --region "$REGION" --repository-names "$REPO" >/dev/null 2>&1 \
  || aws ecr create-repository --region "$REGION" --repository-name "$REPO" \
       --image-scanning-configuration scanOnPush=true >/dev/null

say "Signing in to $REGISTRY"
aws ecr get-authorization-token --region "$REGION" \
  --query 'authorizationData[0].authorizationToken' --output text \
  | base64 -d | cut -d: -f2 \
  | docker login --username AWS --password-stdin "$REGISTRY" >/dev/null

# ECS Fargate runs x86_64 unless the task is configured for ARM. Building on an
# Apple Silicon machine without this produces an arm64 image that starts and
# then dies with an exec format error, which surfaces as a failing health check
# rather than anything that mentions architecture.
say "Building linux/amd64 image"
docker build --platform linux/amd64 -t "${REPO}:${TAG}" -t "${REPO}:latest" api

for t in "$TAG" latest; do
  docker tag "${REPO}:${t}" "${REGISTRY}/${REPO}:${t}"
  docker push "${REGISTRY}/${REPO}:${t}"
done

say "Pushed ${REGISTRY}/${REPO}:${TAG}"
printf '\nNow deploy it:\n  IMAGE_TAG=%s ./deploy/aws-ecs-express.sh\n' "$TAG"
