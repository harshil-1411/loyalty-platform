# Deploy: Dev and Prod Parity

Dev and prod use the **same stack and auth model**. The only differences are context (`environment=dev` vs `prod`), log level, CORS (prod = CloudFront only; dev adds localhost), and tenant handling (prod requires `custom:tenant_id`; dev allows default tenant).

## No bypasses

- **CORS**: Explicit origins only. Prod = CloudFront URL; dev = CloudFront URL + `http://localhost:5173`. No `*`.
- **Authorizer**: All non-webhook routes require a valid Cognito JWT. Prod: token must include `custom:tenant_id` (no default). Dev: if `custom:tenant_id` is missing, authorizer uses tenant `default`.
- **Webhooks**: `/api/v1/webhooks/*` has no JWT (so Razorpay can call). Backend verifies payloads using the webhook secret from SSM (see **Razorpay SSM parameters** below).

## Deploy steps (same for dev and prod)

1. **Docker** running (for backend and authorizer Lambda images).
2. **Build web**:  
   `cd packages/web && npm run build`
3. **Deploy** (dev):  
   `cd packages/infra && AWS_PROFILE=loyalty npx cdk deploy -c environment=dev --require-approval never`  
   **Deploy** (prod):  
   `cd packages/infra && AWS_PROFILE=loyalty npx cdk deploy -c environment=prod --require-approval never`
4. Use CDK outputs (UserPoolId, UserPoolClientId, ApiUrl, WebUrl) for frontend `.env` and for Razorpay webhook URL.
5. **Razorpay**: Replace the placeholder webhook secret in SSM (see below). Until then, webhook requests return 500 "Webhook not configured".

## Environment-specific behaviour

| Item | Dev | Prod |
|------|-----|------|
| CORS | CloudFront + localhost:5173 | CloudFront only |
| Log level | DEBUG | INFO |
| Tenant claim | Optional (default `default` if missing) | Required (`custom:tenant_id`) |
| DynamoDB | PAY_PER_REQUEST, destroy on stack delete | PAY_PER_REQUEST, PITR, retain |
| Removal policy | DESTROY for non-prod resources | RETAIN for prod |

## Razorpay SSM parameters

The stack creates these parameters; the API Lambda reads them at runtime (no secrets in env).

| Parameter | Purpose | Action |
|-----------|---------|--------|
| `/loyalty/{env}/razorpay/webhook-secret` | Verify Razorpay webhook signature | **Replace** initial value `REPLACE_ME` with the secret from Razorpay Dashboard → Webhooks. |
| `/loyalty/{env}/razorpay/key-id` | Razorpay API key ID (subscription-link) | Optional: set if using subscription link. |
| `/loyalty/{env}/razorpay/key-secret` | Razorpay API key secret | Optional: set if using subscription link. |

Example (dev):

```bash
aws ssm put-parameter --name "/loyalty/dev/razorpay/webhook-secret" --value "your_secret_from_razorpay" --type SecureString --overwrite
```

After updating a parameter, the next Lambda cold start picks up the new value (or redeploy to force refresh).

## Completed / implemented

1. **Secrets for API Lambda** — Razorpay webhook secret (and optional key id/secret) in SSM; Lambda reads at runtime. Replace `/loyalty/{env}/razorpay/webhook-secret` from `REPLACE_ME` to your real secret.

2. **Assign `custom:tenant_id` to users** — **Settings** page in the app: users can set their tenant (PATCH `/api/v1/me/tenant`). Backend updates Cognito `custom:tenant_id`. After updating, sign out and sign in again. For prod, every admin must have this set.

3. **CI/CD** — GitLab CI: lint, test (web + backend), synth on MR/develop; **deploy:dev** on `develop`; **deploy:prod** on tag `v*.*.*`. Set CI/CD variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ACCOUNT_ID`, `AWS_REGION`. Runner needs Docker for Lambda images.

4. **Custom domain** — Optional. Create ACM cert (us-east-1 for CloudFront), Route53 hosted zone, then add custom domain to CloudFront and API Gateway; update CORS. See [PROD_CHECKLIST.md](PROD_CHECKLIST.md#custom-domain-optional).

5. **Monitoring** — Stack creates CloudWatch dashboard `loyalty-{env}` (API 4xx/5xx, count, Lambda errors) and alarm `loyalty-{env}-api-errors` (Lambda errors > 10). Configure SNS for alarm notifications in the AWS console if desired.

6. **Prod checklist** — [docs/PROD_CHECKLIST.md](PROD_CHECKLIST.md).
