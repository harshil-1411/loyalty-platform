# Task list

Agents pick the **next available task** (by order) that has **no lock file** in `current_tasks/`. Mark in progress by creating a lock file; when done (tests pass, merged to `develop`), remove the lock and append to [PROGRESS.md](PROGRESS.md).

**Done when:** Unless otherwise stated, a task is done when the change is merged to `develop`, tests pass, and the lock file is removed.

**Quality bar:** Full CI with unit and functional tests for every feature; goal zero production bugs. API versioning (`/api/v1/`) and tenant-scope from day 1. See [docs/DECISIONS.md](docs/DECISIONS.md).

---

## Phase 0 — Foundation (do first, mostly sequential)

| ID | Task | Done when |
|----|------|-----------|
| 0.1 | Create PRD draft in `docs/PRD.md` (vision, personas, MVP features, flows, constraints) | PRD merged and agreed. |
| 0.2 | Add `docs/ARCHITECTURE.md` and lock stack (backend, DB, frontend, CDK layout) | ARCHITECTURE merged. |
| 0.3 | Add agent coordination: `TASKS.md`, `PROGRESS.md`, `FAILED_TASKS.md`, `current_tasks/`, `docs/AGENT_RUNBOOK.md` | All artifacts present and merged. |
| 0.4 | Initialize CDK app in `packages/infra`: empty stack, deployable | `cdk synth` succeeds and stack can be deployed. |

## Phase 1 — Backend and data (parallelizable)

| ID | Task | Done when |
|----|------|-----------|
| 1.1 | CDK: DynamoDB tables with tenant isolation; PK/SK and access patterns documented; design future-ready for analytics | Tables in CDK; key design doc (e.g. in ARCHITECTURE_DIAGRAMS or one-pager). |
| 1.2 | CDK: Cognito user pool + app client; optional identity pool if needed | Auth works for API and (when implemented) web. |
| 1.3 | CDK: API Gateway (HTTP API) + Lambda; base path `/api/v1/`; one "hello" endpoint (e.g. GET /api/v1/hello); tenant-scoped auth pattern | `GET /api/v1/hello` returns 200; `cdk deploy` succeeds; routes under /api/v1/. |
| 1.4 | Lambda: Program CRUD (create/read/update program) per PRD; tests | API and unit tests pass. |
| 1.5 | Lambda: Points earn/burn transaction API; tests | API and unit tests pass. |
| 1.6 | Lambda: Rewards catalog and redemption (minimal MVP); tests | API and unit tests pass. |

## Phase 2 — Frontend (parallelizable)

| ID | Task | Done when |
|----|------|-----------|
| 2.1 | Scaffold frontend (React/Vite) in `packages/web`; CDK: S3 + CloudFront | Build and deploy succeed; app loads from CloudFront. |
| 2.2 | Auth UI (login/sign-up) wired to Cognito | Users can sign up and sign in. |
| 2.3 | Dashboard shell (layout, nav, tenant context) | Shell renders with nav and tenant placeholder. |
| 2.4 | Program setup UI (create/edit program, basic rules) | CRUD flows work against API. |
| 2.5 | Transaction/balance UI (earn/burn, history) | Users can view balance and history; earn/burn where applicable. |
| 2.6 | Rewards catalog and redeem flow UI | Catalog and redeem flow work against API. |
| 2.7 | Contact / Support page or footer: email and support phone number visible | Users see support email and number (per [docs/DECISIONS.md](docs/DECISIONS.md)). |

## Phase 3 — Quality and ops (parallelizable)

| ID | Task | Done when |
|----|------|-----------|
| 3.1 | CI pipeline (GitLab CI): lint, unit tests, functional tests, CDK synth (and deploy to dev) | Full CI; every feature has unit and functional tests; goal zero production bugs. |
| 3.2 | E2E or API integration tests (e.g. Postman/Newman or Playwright against deployed API) | Integration tests run in CI against dev. |
| 3.3 | Docs: API spec (OpenAPI), README for runbooks and env vars; Razorpay runbook (test vs live, keys) | OpenAPI and runbook updates merged; runbook documents Razorpay setup. |
| 3.4 | Cost and monitoring: CDK tags, billing alerts, optional dashboard (CloudWatch); Lambda logs and webhook failure visibility | Tags applied; webhook failures visible in logs or alert. |
| 3.5 | Legal: Terms of Service and Privacy Policy pages (or placeholders) | ToS and Privacy Policy linked from app (e.g. footer). |
| 3.6 | GST and invoice: capability or placeholder for issuing compliant invoices to paid customers | Documented or implemented so first paying customer can receive invoice. |

## Phase 4 — Monetization & India (parallelizable)

| ID | Task | Done when |
|----|------|-----------|
| 4.1 | Razorpay: create Plans in Razorpay and map to internal plan IDs (Starter, Growth, Scale per [docs/PRICING.md](docs/PRICING.md)) | Plans exist in Razorpay; env/config maps plan_id to Razorpay plan id. |
| 4.2 | Subscription creation flow: UI + API to create Razorpay Subscription per tenant (Checkout for first payment); store plan and subscription id in DB | Tenant can select plan and complete first payment; tenant record updated. |
| 4.3 | Webhook handler: API Gateway + Lambda for Razorpay webhooks; verify signature; update tenant billing_status and current_period_end on subscription events | Webhook endpoint secured; subscription.charged / subscription.cancelled etc. update DB. |
| 4.4 | Billing UI: plan selection, current plan, billing status, and (optional) manage subscription link in dashboard | Merchants can see and change plan; status reflects webhook updates. |
| 4.5 | i18n provision: message keys and locale structure (English first); optional language switcher for future Hindi | App is structured for i18n; English default; Hindi can be added later. |
| 4.6 | Tenant/user language preference: store and respect display language; INR and India date/number formatting | Backend stores preference; frontend formats currency (INR) and dates for India. |

## Phase 5 — Growth features (parallelizable)

| ID | Task | Done when |
|----|------|-----------|
| 5.1 | Referral campaigns: data model and API for referrer + referred; reward on qualified sign-up or first purchase | Referral tracking and reward issuance work per PRD Phase 2. |
| 5.2 | Outbound webhooks: tenant-configurable webhook URLs; emit events (points issued, redeemed, tier change); API keys for delivery | Merchants can subscribe to events; docs and tests pass. |
| 5.3 | Notifications: email (e.g. SES) for points earned, redemption confirmation, tier upgrade; optional in-app | Notifications sent for key events; configurable per tenant. |
| 5.4 | Merchant payments (optional): Razorpay Payments for tenant-initiated charges (e.g. paid rewards, top-up); webhook handler for payment.captured / payment.failed | Tenants can charge end-users via Razorpay; idempotency and status in DB. |
| 5.5 | Gamification (Phase 3): badges, challenges, streaks; data model and rules | Challenges and completion tracked; basic gamification flows work. |
| 5.6 | Advanced analytics: cohort analysis, redemption trends, program KPIs (Phase 3) | Reporting and dashboards per PRD Phase 3. |
| 5.7 | Offline / POS: offline-earn reconciliation (batch upload or sync when online) | Retail use case supported; docs updated. |
