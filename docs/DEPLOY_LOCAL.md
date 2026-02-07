# Deploy and run (local dev against deployed stack)

Stack is deployed to **AWS account 396913709733** (ap-south-1). Use the **loyalty** AWS profile for CDK and CLI.

## AWS profile

CDK and AWS CLI use the **loyalty** profile (account 396913709733):

```bash
export AWS_PROFILE=loyalty
# or prefix commands: AWS_PROFILE=loyalty npx cdk deploy ...
```

## Deployed outputs (from `cdk deploy`)

After a successful deploy you'll see:

| Output | Value (current) |
|--------|------------------|
| **ApiUrl** | `https://nx51c96s16.execute-api.ap-south-1.amazonaws.com` |
| **UserPoolId** | `ap-south-1_x3AUAF8To` |
| **UserPoolClientId** | `3v5ndgaql2fc6ule632r2s8c3u` |
| **WebUrl** | `https://d2vx5u744mjw3l.cloudfront.net` |

## Run web app locally

From repo root:

```bash
cd packages/web
```

Create a `.env` file (or export in the shell) with the **current** stack outputs:

```env
VITE_COGNITO_USER_POOL_ID=ap-south-1_x3AUAF8To
VITE_COGNITO_CLIENT_ID=3v5ndgaql2fc6ule632r2s8c3u
VITE_API_URL=https://nx51c96s16.execute-api.ap-south-1.amazonaws.com
```

Then:

```bash
npm run dev
```

Open http://localhost:5173 — sign up / sign in with Cognito, then use Programs, Transactions, Rewards, Billing.

## Run integration tests against deployed API

```bash
cd packages/api
API_BASE_URL=https://nx51c96s16.execute-api.ap-south-1.amazonaws.com npm run test:integration
```

## Redeploy after code changes

1. Build API and web:  
   `cd packages/api && npm run build`  
   `cd packages/web && npm run build`
2. Deploy (use the loyalty profile):  
   `cd packages/infra && AWS_PROFILE=loyalty npx cdk deploy -c environment=dev --require-approval never`

Update `.env` if CDK outputs change (e.g. new stack).
