# Razorpay runbook (test vs live, keys)

Per [ARCHITECTURE.md](ARCHITECTURE.md) and [DECISIONS.md](DECISIONS.md): use **Razorpay test mode** for dev/staging and **Razorpay live** only for production.

## Keys and env

- **Dev/staging:** Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` from Razorpay Dashboard → Test mode → API Keys.
- **Prod:** Set the same env vars from Razorpay Dashboard → Live mode → API Keys.
- Store keys in AWS SSM Parameter Store (e.g. `/loyalty/{env}/razorpay/key_id`) or in Lambda environment (via CDK) and restrict access with IAM.

## Webhook secret

- In Razorpay Dashboard (Test or Live), create a Webhook and set the URL to your API Gateway webhook route (e.g. `https://{api-id}.execute-api.{region}.amazonaws.com/webhook/razorpay`).
- Copy the **Webhook Secret** and set it as `RAZORPAY_WEBHOOK_SECRET` in the same place as the API keys. The webhook Lambda must verify the signature using this secret.

## Runbook checklist

1. Get API keys from Razorpay Dashboard (Test for dev, Live for prod).
2. Add keys to SSM or Lambda env; do not commit keys to git.
3. Create Plans in Razorpay (Starter, Growth, Scale) per [PRICING.md](PRICING.md); note Plan IDs for config.
4. Configure webhook URL and secret for subscription (and optionally payment) events.
