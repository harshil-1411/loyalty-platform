#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { LoyaltyPlatformStack } from '../lib/loyalty-platform-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'ap-south-1',
};

/**
 * Dev stack — keeps the original stack name so the existing deployment
 * is updated in place (no resource recreation).
 */
new LoyaltyPlatformStack(app, 'LoyaltyPlatformStack', {
  env,
  environment: 'dev',
  budgetAlertEmail: 'suparn.bector@msbdocs.com',
});

/**
 * Demo stack — isolated resources, behaves like dev config-wise.
 * Deploy: AWS_PROFILE=loyalty npx cdk deploy LoyaltyPlatformStack-demo
 */
new LoyaltyPlatformStack(app, 'LoyaltyPlatformStack-demo', {
  env,
  environment: 'demo',
  budgetAlertEmail: 'suparn.bector@msbdocs.com',
});

/**
 * Prod stack — production hardening (PITR, RETAIN policies, stricter auth).
 * Deploy: AWS_PROFILE=loyalty npx cdk deploy LoyaltyPlatformStack-prod
 */
new LoyaltyPlatformStack(app, 'LoyaltyPlatformStack-prod', {
  env,
  environment: 'prod',
  budgetAlertEmail: 'suparn.bector@msbdocs.com',
});
