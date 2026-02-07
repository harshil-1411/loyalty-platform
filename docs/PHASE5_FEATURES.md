# Phase 5 — Growth features (planned)

Per [TASKS.md](../TASKS.md) Phase 5. These are documented for implementation when needed. Data model and API notes below.

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 5.1 | Referral campaigns | Planned | Data model: referrer_id, referred_id, reward_issued; API: POST /api/v1/referrals, reward on qualified sign-up; link to existing earn API. |
| 5.2 | Outbound webhooks | Planned | Tenant config: webhook_url, events[]; store in TENANT or config entity; on points_issued, redeemed, tier_change invoke URL with API key header; retry and log failures. |
| 5.3 | Notifications (email/SES) | Planned | SES template for points earned, redemption, tier upgrade; tenant preference for email on/off; optional in-app notification table. |
| 5.4 | Merchant payments (Razorpay) | Planned | Razorpay Orders for tenant-initiated charges; webhook payment.captured/failed; idempotency key; store payment status in DB. |
| 5.5 | Gamification (badges, challenges) | Planned | Data model: challenges, completions, badges; rules engine or config; API for list challenges, record completion, list badges. |
| 5.6 | Advanced analytics | Planned | GSI1 already supports tenant-scoped txn queries; add reporting API (cohorts, redemption trends, KPIs); optional dashboard widgets. |
| 5.7 | Offline / POS | Planned | Batch upload API for offline earn transactions; reconciliation job; docs for retail/POS integration. |

Implement in order of product priority; each can be a separate feature branch.
