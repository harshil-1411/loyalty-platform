# Product and technical decisions

This document records key product and technical decisions for the Loyalty Management Platform. Use it as the single source of truth when implementing features or onboarding new developers.

---

## Go-live and monetization

| Decision | Choice |
|----------|--------|
| **Monetization model** | Option A: Merchant can sign up, choose a plan, pay (Razorpay), and use the product (create program, run earn/burn, redemption). |
| **First customers** | Self-serve: sign up on site → choose plan → pay on Razorpay → get access. Requires sign-up, plan selection, Razorpay Checkout, webhook to activate subscription/tenant. |
| **Timeline** | Realistic go-live (e.g. 30 days or as needed). No fixed 15-day hard deadline. Goal: best product, well tested, **zero production bugs**. Build what is needed even if it takes longer. |
| **Merchant-facing payments** | Phase 2. We start by charging the merchant (platform billing via Razorpay Subscriptions); tenant charging end-users (e.g. paid rewards) comes later. |

---

## Technical (Phase 1 and beyond)

| Decision | Choice |
|----------|--------|
| **Tenant in every API and table** | From day 1, every API path and DynamoDB access must be tenant-scoped (`tenant_id` in partition key or auth). No cross-tenant queries. Adding tenant scope later would be a large refactor. |
| **API versioning** | Use `/api/v1/` (or equivalent) from the first API. All loyalty and billing APIs live under this prefix so we can change behavior in v2 without breaking early integrations. |
| **Razorpay: test vs live** | **Dev/staging:** Razorpay test mode and test credentials. **Prod:** Razorpay live mode only. Store keys in env or SSM; document in a short runbook so new devs and CI can run without production keys. |
| **DynamoDB design** | Design and document PK/SK (e.g. single-table: `TENANT#id`, `PROGRAM#id`, etc.) and access patterns from the start. Design **future-ready for analytics** (e.g. reporting, cohort queries) so we avoid schema changes after real data exists. See [ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md) data model and any DynamoDB one-pager. |
| **CI and testing** | **Full CI** with proper **unit and functional testing** for every feature. Goal: **zero production bugs**. Pipeline: lint, unit tests, functional tests, `cdk synth` (and deploy for target env). No feature merges without tests. |
| **Lambda logs and webhooks** | Lambda logs go to CloudWatch. Razorpay webhook failures must be visible: log on non-200, optional dead-letter or alert on "webhook failed" so we can debug and retry. |
| **API and API keys UI** | Defer **public API and API keys UI** to a later phase (dashboard-first). Backend must be built with **best practices for API development** and **tenant-scoped API key auth** from the start so we don’t redesign when we expose the API. |

---

## Product and scope

| Decision | Choice |
|----------|--------|
| **Minimum sellable scope** | Goal is the **best product** in the market; no artificial “minimum in 15 days.” Ship when quality and testing are done. |
| **Legal (India)** | Include in project: **Terms of Service**, **Privacy Policy**. For paid customers: **GST and invoice format** (or integration) so we can issue compliant invoices. Placeholders or short first versions are fine; avoid this becoming a blocker when the first customer asks. |
| **Support channel** | **Email** and **support phone number**. Mention both in the app (e.g. Contact / Help page or footer). No in-app chat or complex ticketing for initial launch. |
| **i18n** | **English first.** Have **provision in the project** for i18n (e.g. keys and structure) so Hindi or other languages can be added later without rework. |
| **Referral, gamification, analytics, webhooks** | Phased (Phase 2/3). Timeline is flexible; build what is needed when it is needed, even if it extends beyond initial estimates. |

---

## Operations

| Decision | Choice |
|----------|--------|
| **Environments** | **Dev:** Razorpay test mode. **Prod:** Razorpay live. Same CDK stack, different stage/config (e.g. `dev` vs `prod`). |
| **DynamoDB in prod** | Enable **point-in-time recovery (PITR)** in production when we go live so we can recover from accidental deletes or corruption. |
| **Rollback** | CDK/CloudFormation is the source of truth. Tag or note **“last known good”** deploy so we can roll back if a release breaks production. |

---

## Summary for developers

- **Tenant everywhere.** No API or table without tenant scope.
- **API under `/api/v1/`.** Version from day 1.
- **Razorpay:** test in dev, live in prod; keys in env/SSM; runbook for setup.
- **DynamoDB:** document key design and access patterns; design for future analytics.
- **CI:** full pipeline; unit + functional tests for every feature; aim for zero production bugs.
- **Legal:** ToS, Privacy Policy, GST/invoice capability in scope.
- **Support:** email + support number in Contact details.
- **i18n:** English first; project structured for adding languages later.
- **API keys UI:** later phase; backend ready for tenant-scoped API key auth now.
