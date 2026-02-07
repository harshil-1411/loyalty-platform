# Cost and monitoring

Per [TASKS.md](../TASKS.md) 3.4: CDK tags, billing awareness, Lambda logs, and webhook failure visibility.

## CDK tags

All stack resources are tagged with:

- **Project:** `LoyaltyPlatform`
- **Environment:** `dev` | `prod` (from `-c environment=prod`)

Use these in AWS Cost Explorer to filter by project and environment.

## Billing alerts

AWS Budgets is not created by CDK (requires email and account-level setup). To get cost alerts:

1. In **AWS Billing Console** → **Budgets** → Create a budget (e.g. monthly cost budget with alert at 80% and 100%).
2. Set the budget scope using the tags above (e.g. filter by `Project=LoyaltyPlatform`).

## Lambda logs

- The API Lambda (`ApiHandler`) writes to **CloudWatch Logs** automatically. Log group: `/aws/lambda/<stack-name>-ApiHandler*`.
- Use **CloudWatch Logs Insights** to query errors: filter by `?ERROR` or `statusCode >= 400`.
- Log retention is set in CDK (e.g. 30 days for dev, 90 for prod) to control storage cost.

## Webhook failure visibility

When Razorpay webhooks are implemented (Phase 4):

- The webhook Lambda should **log all incoming payloads** (sanitized) and **log verification failures** and **processing errors** with clear messages.
- Optionally create a **CloudWatch Alarm** on the webhook Lambda’s error metric (`Errors`) or on a log metric filter for `"webhook" AND "failed"`.
- Runbook: [RUNBOOK_RAZORPAY.md](RUNBOOK_RAZORPAY.md).
