#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { LoyaltyPlatformStack } from '../lib/loyalty-platform-stack';

const app = new cdk.App();

new LoyaltyPlatformStack(app, 'LoyaltyPlatformStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  tags: {
    Project: 'LoyaltyPlatform',
    Environment: app.node.tryGetContext('environment') || 'dev',
  },
});
