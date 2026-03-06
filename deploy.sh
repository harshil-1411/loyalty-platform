#!/bin/bash
# Deploy loyalty platform (dev stack) to ap-south-1
# Usage: bash deploy.sh
#
# IMPORTANT: Always run from the loyalty-platform root directory.
# This script clears cdk.out before deploying to avoid a stale region cache
# (if cdk.out was synthesized with the wrong CDK_DEFAULT_REGION, CloudFormation
# will reference S3 assets in the wrong region and fail with EarlyValidation).

set -e

REGION="ap-south-1"
STACK="LoyaltyPlatformStack"
INFRA_DIR="$(dirname "$0")/packages/infra"

echo ">>> Clearing stale CDK synthesis cache..."
rm -rf "$INFRA_DIR/cdk.out"

echo ">>> Deploying $STACK to $REGION..."
cd "$INFRA_DIR"

AWS_DEFAULT_REGION=$REGION \
CDK_DEFAULT_REGION=$REGION \
  npx cdk deploy $STACK \
  --region $REGION \
  --require-approval never \
  "$@"

echo ">>> Done."
