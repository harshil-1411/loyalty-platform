# Frontend UI/UX task list

Agents pick the **next available task** that has **no lock file** in `current_tasks/`. Create a lock file when starting; remove it and append to [PROGRESS.md](PROGRESS.md) when done (tests pass, merged to `develop`).

Align with [docs/DEVELOPMENT_STANDARDS.md](docs/DEVELOPMENT_STANDARDS.md), [docs/FRONTEND_NEXT_STEPS.md](docs/FRONTEND_NEXT_STEPS.md), and [TASKS.md](TASKS.md).

---

## UX polish & consistency

| ID | Task | Done when | Dependencies |
|----|------|-----------|---------------|
| F.1 | Transaction history: type filter + responsive card view | **Done** 2025-02-07 | Backend list transactions API |
| F.2 | Transaction history: date range filter (client or API) | Date filter works; empty state when no results | Backend may need date params |
| F.3 | Toasts on all main mutations (if any missing) | Sonner on create/update/delete where applicable | — |
| F.4 | Dashboard: real KPIs when analytics API exists | Replace placeholders with API data | Analytics endpoint |

---

## Phase 5 — Frontend (when backend ready)

| ID | Task | Done when | Dependencies |
|----|------|-----------|---------------|
| F.5.1 | Referral campaigns UI | Referral link, share, “Referred by” | 5.1 API |
| F.5.2 | Outbound webhooks UI (Settings) | Webhook URL, events, API key | 5.2 API |
| F.5.3 | Notification preferences UI | Email on/off, in-app if applicable | 5.3 API |
| F.5.4 | Merchant payments UI (Razorpay) | Initiate payment, status view | 5.4 API |
| F.5.5 | Gamification UI (badges, challenges) | List, progress, completion | 5.5 API |
| F.5.6 | Advanced analytics / reporting | Recharts, cohorts, redemption trends | 5.6 API |
| F.5.7 | Offline / POS: batch upload or reconciliation UI | Docs + optional UI | 5.7 API |

---

## Quality & docs

| ID | Task | Done when |
|----|------|-----------|
| F.Q1 | DESIGN_SYSTEM.md or COMPONENTS.md | **Done** 2025-02-07 — docs/DESIGN_SYSTEM.md, docs/COMPONENTS.md |
| F.Q2 | A11y pass (Lighthouse / axe) | No new regressions; focus order, contrast |
| F.Q3 | E2E for login → dashboard → transaction filter | Playwright flow with API mocks or E2E_AUTH |

---

## Bug fixes & refactors

| ID | Task | Done when |
|----|------|-----------|
| F.B1 | Fix layout shifts on resize | No CLS on viewport change |
| F.B2 | Consistent empty/loading/error states across pages | Same patterns everywhere |

Add new tasks here when the project evolves; note dependencies (e.g. backend endpoints).
