# Production deployment checklist

Use this before the first production deploy and after any infra/auth change.

## Before first prod deploy

- [ ] **Razorpay**  
  - [ ] SSM parameter `/loyalty/prod/razorpay/webhook-secret` updated from `REPLACE_ME` to the real webhook secret from Razorpay Dashboard.  
  - [ ] (Optional) `/loyalty/prod/razorpay/key-id` and `key-secret` set if using subscription link.

- [ ] **Tenant & users**  
  - [ ] All prod admin users have Cognito custom attribute `custom:tenant_id` set (via **Settings** in the app, or Cognito Admin API, or post-confirmation Lambda).  
  - [ ] No reliance on default tenant in prod (authorizer denies when `custom:tenant_id` is missing).

- [ ] **CORS & auth**  
  - [ ] CORS is the CloudFront origin only (no `*`).  
  - [ ] Authorizer is attached to all non-webhook routes.  
  - [ ] Webhook route has no JWT; backend verifies Razorpay signature.

- [ ] **CI/CD**  
  - [ ] GitLab CI/CD variables set: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ACCOUNT_ID`, `AWS_REGION`.  
  - [ ] Deploy prod via tag (e.g. `v1.0.0`) or manual pipeline run.

- [ ] **Monitoring**  
  - [ ] CloudWatch dashboard `loyalty-prod` exists (created by stack).  
  - [ ] Alarm `loyalty-prod-api-errors` is created; configure SNS for notifications if desired.

## After prod deploy

- [ ] Update frontend config (e.g. build env or .env) with prod **ApiUrl**, **UserPoolId**, **UserPoolClientId**, **WebUrl** from CDK outputs.  
- [ ] In Razorpay Dashboard, set webhook URL to `https://<ApiUrl>/api/v1/webhooks/razorpay`.  
- [ ] Smoke-test: sign in, set tenant (Settings), create a program, run a transaction.

## Custom domain (optional)

To use your own domain for the web app and API:

1. Create an ACM certificate (us-east-1 for CloudFront) for your domain.  
2. Create a Route53 hosted zone (or use existing).  
3. Add a custom domain to the CloudFront distribution and create an A/AAAA alias in Route53.  
4. For API Gateway, add a custom domain and map it to the HTTP API.  
5. Update CORS in the stack to allow your domain.  
6. Update Cognito callback/sign-out URLs if using hosted UI.

See [DEPLOY.md](DEPLOY.md) for deploy steps and dev/prod parity.
