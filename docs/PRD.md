# Product Requirements Document: Loyalty Management Platform

## Vision & goals

The Loyalty Management Platform is a SaaS product that enables businesses to run their own loyalty programs (points, tiers, rewards, campaigns) without building or operating custom infrastructure. Merchants can onboard as tenants, define programs and rules, and offer earn/burn and redemption experiences to their end-users. Success is measured by: tenant onboarding time, program creation and activation, transaction volume (earn/burn), and redemption flows—all delivered via a serverless, multi-tenant AWS application deployed with CDK.

**Go-live:** Realistic timeline (e.g. 30 days or as needed); goal is the **best product** in the market, well tested, with **zero production bugs**. See [docs/DECISIONS.md](DECISIONS.md) for monetization model (self-serve sign-up, plan selection, Razorpay, webhook activation) and quality bar.

## User personas

| Persona | Description | Primary needs |
|--------|--------------|----------------|
| **Program Admin** | Merchant or brand staff who configures and operates the loyalty program. | Create/edit programs, set rules (earn rates, tiers), manage rewards catalog, view basic reporting. |
| **End-user (Customer)** | Consumer who earns and redeems points. | View balance and history, earn points at touchpoints, redeem rewards. |
| **API consumer** | External systems (POS, e-commerce, mobile) that post transactions or query balances. | REST API for earn/burn and balance lookup; secure, tenant-scoped access. |

## Core features (MVP)

- **Program setup:** Create and edit loyalty programs; define points currency, tiers, and basic earn/burn rules (e.g. 1 point per ₹1, tier multipliers).
- **Tiered loyalty:** Multiple membership tiers with different earn rates, burn rates, or reward access; tier thresholds and rules configurable per program.
- **Earn/burn transactions:** API and (where applicable) UI to record earn and burn events; balance updates and idempotency where required.
- **Rewards catalog:** Define rewards (fixed points cost, optional tiers); support redeem flow (deduct points, record redemption).
- **Basic reporting:** Per-tenant views: total points issued, redeemed, active members; optional export.
- **Tenant isolation:** All data and API access scoped by tenant; no cross-tenant access.

## Monetization & payments

### Payment gateway (Razorpay, India)

- **Platform billing:** We charge merchants/tenants for subscription plans via **Razorpay Subscriptions**. Create Plans in Razorpay (e.g. Starter, Growth, Scale), create a Subscription per tenant, use Razorpay Standard Checkout for first payment and authorization. Handle webhooks (e.g. `subscription.charged`, `subscription.cancelled`) to keep tenant plan and billing status in sync in our DB.
- **Merchant payments (Phase 2 / later):** Optional Razorpay Payments for tenant-initiated charges (e.g. paid rewards, points top-up). Use Razorpay webhooks (`payment.captured`, `payment.failed`) and idempotency; PCI remains with Razorpay (we do not store card data).

### SaaS monetization

- **Who is charged:** Merchants/tenants (Program Admins’ organizations), not end-users.
- **What we charge for:** Subscription to the platform (dashboard access, API, program/member limits, support tier). Usage-based pricing (e.g. points issued, API calls) may be added later.
- **How we charge:** Recurring billing via Razorpay Subscriptions (monthly or annual). First payment and optional trial via Razorpay Checkout; subsequent charges automatic.
- **What we store:** Tenant record holds: `plan_id`, `razorpay_subscription_id`, `billing_status` (active / past_due / cancelled / trialing), `current_period_end`. Used for access control (limits, feature flags) and billing UI.

### Price plans (India, INR)

See [docs/PRICING.md](PRICING.md) for suggested tiers. Summary:

- **Starter:** Low monthly fee (e.g. ₹999–1,499/month). Limits: e.g. 1 program, up to 1,000 active members, basic reporting. Target: small merchants, single-store.
- **Growth:** Mid tier (e.g. ₹2,999–4,999/month). Multiple programs, higher member cap (e.g. 10,000), API access, better reporting. Target: growing D2C / multi-outlet.
- **Scale / Enterprise:** Custom pricing. Higher limits, priority support, SLA, optional white-label. Target: large brands, aggregators.
- **Trial:** e.g. 14-day free trial (Razorpay supports trial in subscription).
- **Currency:** All amounts in **INR** for India launch; display may be GST-inclusive per Indian norms.

## India-first launch

- **Default locale:** India — INR as default currency; date and number formats for India; timezone Asia/Kolkata.
- **Language support:** Launch with **English** first. The project must have **provision for i18n** (e.g. key-based messages, locale structure) so Hindi or other languages can be added later without rework. Use standard i18n (e.g. react-i18next, keys + JSON); support Devanagari when Hindi is added.
- **Currency:** INR as default; store and display amounts with currency code (ISO 4217); Razorpay amounts in INR (paise as smallest unit per Razorpay API).

## Legal and support (India)

- **Legal:** Include **Terms of Service** and **Privacy Policy** (short or placeholder is fine for launch). For paid customers: support **GST and invoice format** (or integration) so we can issue compliant invoices when the first customer asks.
- **Support:** **Email** and **support phone number**. Both must be visible in the app (e.g. Contact / Help page or footer: "Contact: support@… / +91 …"). No in-app chat or ticketing for initial launch.

## Non-goals / later

- **Advanced analytics:** Custom dashboards, cohort analysis, predictive models — Phase 3.
- **Mobile SDK:** Native iOS/Android SDKs — later phase.
- **White-label:** Custom domains, full white-label frontend — later phase.
- **Merchant-facing payments:** Tenant-initiated Razorpay Payments (e.g. paid rewards) — Phase 2; platform billing (Razorpay Subscriptions) is in scope for MVP/post-MVP.

## Key user flows

1. **Tenant sign-up → Create program:** Program Admin signs up (or is provisioned), logs in, creates a program (name, points currency, optional tiers and rules).
2. **Define rules:** Set earn rules (e.g. 1 point per ₹1), burn rules, tier thresholds and multipliers.
3. **Issue / redeem points:** Via API or UI: post earn transaction (e.g. purchase event) or burn transaction (redemption); balance and history updated. Default currency context: INR (India).
4. **View balance / history:** End-user or Admin views current balance and transaction history (earn/burn/redemption).
5. **Rewards catalog:** Admin adds rewards; End-user (or API) redeems by selecting reward and confirming; points deducted, redemption recorded.

## Technical constraints

- **SaaS:** Multi-tenant from day one; tenant ID on every resource and API call.
- **Serverless:** AWS Lambda, API Gateway, DynamoDB (or approved DB), Cognito; no long-lived servers.
- **Deployment:** AWS CDK for all infrastructure; single pipeline (e.g. GitLab CI) for synth/deploy.
- **Frontend:** Web app only for MVP; static or serverless hosting (e.g. S3 + CloudFront or serverless Next).
- **Payments:** Razorpay (India) for platform subscription billing and (later) merchant-facing payments; INR as default currency for billing.

## Security & compliance

- **Auth:** AWS Cognito for Program Admin and (if applicable) End-user identity; API access via Cognito JWT or API keys scoped to tenant.
- **Data isolation:** Tenant ID in partition key (or equivalent); IAM and application logic enforce no cross-tenant access.
- **Least privilege:** Lambdas and roles minimal permissions; no wildcard resource access.
- **Payments and PCI:** We do not store or process card data. Razorpay is PCI-compliant; we store only Razorpay `customer_id`, `subscription_id`, and payment metadata needed for billing status and reconciliation.

## Feature roadmap

| Phase | Feature | Description | Market rationale |
|-------|---------|-------------|-------------------|
| MVP | Program setup, tiered loyalty, earn/burn, rewards catalog, basic reporting | Core loyalty operations; tenant isolation | Foundation for all segments. |
| MVP / post-MVP | Platform billing (Razorpay Subscriptions) | Charge tenants for plans; webhooks; plan/status in DB | SaaS revenue; India (INR). |
| Phase 2 | Referral campaigns | Referral rewards; referrer + referred tracking; auto reward on sign-up/first purchase | High impact for viral growth in India. |
| Phase 2 | API & outbound webhooks | Public API for programs, transactions, balance; webhooks for events (points issued, redeemed, tier change) | POS, e-commerce, mobile integration. |
| Phase 2 | Notifications | In-app or email (e.g. points earned, redemption, tier upgrade); later WhatsApp | Engagement; India prefers WhatsApp. |
| Phase 2 | Merchant payments (optional) | Razorpay Payments for tenant-initiated charges (paid rewards, top-up) | Monetization for merchants. |
| Phase 3 | Gamification | Badges, challenges, streaks | Differentiation; engagement. |
| Phase 3 | Advanced analytics | Cohort analysis, redemption trends, program KPIs | Enterprise and growth tiers. |
| Phase 3 | Offline / POS | Offline-earn reconciliation (batch upload or sync when online) | Retail; India offline touchpoints. |

## Success criteria

- **Functional:** API can create a program and apply an earn transaction; balance reflects correctly; a redemption can be performed and balance decreases.
- **Performance:** API latency p95 for create-program and apply-transaction &lt; 500 ms under expected load.
- **Operational:** Deployment via CDK succeeds; all resources tagged; billing alert configured; Razorpay webhook failures visible (logs or alert).
- **Quality:** Full CI with **unit and functional tests** for every feature; goal **zero production bugs**. CI runs on every merge to develop. See [docs/DECISIONS.md](DECISIONS.md).
