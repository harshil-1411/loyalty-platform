# Frontend features — Implemented vs pending (phase-wise)

Frontend-specific features for the Loyalty Platform web app (`packages/web`).  
Aligned with [TASKS.md](../TASKS.md) and [FRONTEND_NEXT_STEPS.md](FRONTEND_NEXT_STEPS.md).

---

## Phase 0 — Foundation

| Task ID | Feature | Status | Notes |
|---------|---------|--------|--------|
| 0.1–0.4 | PRD, Architecture, agent coordination, CDK init | **Done** | No frontend-specific deliverable; foundation for all phases. |

---

## Phase 2 — Frontend (core)

| Task ID | Feature | Status | Notes |
|---------|---------|--------|--------|
| 2.1 | Scaffold (React/Vite), S3 + CloudFront | **Done** | React 19, Vite 7, TypeScript, Tailwind, Shadcn, React Router v7, Zustand, Lucide. |
| 2.2 | Auth UI (login / sign-up) wired to Cognito | **Done** | Login, SignUp, confirm step; protected routes; redirect when authenticated. |
| 2.3 | Dashboard shell (layout, nav, tenant context) | **Done** | AppShell, nav with Programs / Transactions / Rewards / Billing / Contact, tenant display, sign out. |
| 2.4 | Program setup UI (create / edit program) | **Done** | List, create form, edit form; CRUD against API. |
| 2.5 | Transaction/balance UI (earn/burn, history) | **Done** | Balance card, earn/burn forms, program + member select. **Pending:** Transaction history list when API supports it. |
| 2.6 | Rewards catalog and redeem flow UI | **Done** | Catalog tab (list, add reward), Redeem tab (member + reward select, redeem). |
| 2.7 | Contact / Support page or footer | **Done** | Contact page + footer with email and support number. |

---

## Phase 3 — Quality and ops (frontend-relevant)

| Task ID | Feature | Status | Notes |
|---------|---------|--------|--------|
| 3.2 | E2E / integration tests | **Done** | Playwright: smoke, login, navigation, performance, critical flows (auth flows skipped unless `E2E_AUTH=1`). |
| 3.5 | Legal (ToS, Privacy) | **Done** | Placeholders linked from app (e.g. footer). |

---

## Phase 4 — Monetization & India (frontend)

| Task ID | Feature | Status | Notes |
|---------|---------|--------|--------|
| 4.4 | Billing UI | **Done** | Plan selection, current plan, billing status, subscribe (redirect to Razorpay). |
| 4.5 | i18n (message keys, locale structure) | **Done** | English and Hindi; language switcher in header. |
| 4.6 | INR and India date/number formatting | **Done** | formatINR, formatDateIndia; tenant language preference (backend stores). |

---

## UX polish & testing (from FRONTEND_NEXT_STEPS)

| Item | Feature | Status | Notes |
|------|---------|--------|--------|
| — | Loading states (Skeleton / spinners) | **Done** | Programs, Transactions, Rewards, Billing, Dashboard use Shadcn Skeleton. |
| — | Toasts (Sonner) for success/error | **Done** | Program created/updated, points earned/burned, reward added/redeemed, billing redirect. |
| — | Dashboard with real value | **Done** | Real program count, links to Programs/Transactions/Rewards, sample Recharts KPI. |
| — | Transaction history UI | **Pending** | Placeholder + table shell on Transactions page; **depends on API** listing transactions. |
| — | Shadcn Select & Tabs | **Done** | Select for program/reward pickers; Tabs for Rewards (Catalog / Redeem). |
| — | Vitest unit tests | **Done** | 99 tests (auth, Login, SignUp, Programs, Transactions, Rewards, Billing, Dashboard, Contact, API, UI, smoke). |
| — | Playwright E2E | **Done** | Smoke, login, navigation, performance, flows (auth flows conditional on `E2E_AUTH=1`). |
| — | A11y (optional) | **Done** | E2E `e2e/a11y.spec.ts`: axe-core WCAG 2.1 AA on login, signup, contact, home, dashboard. |

---

## Phase 5 — Growth features (frontend UI)

*Backend for Phase 5 is planned in [PHASE5_FEATURES.md](PHASE5_FEATURES.md). Frontend UI below is **pending** until corresponding API/data exists.*

| Task ID | Feature | Status | Frontend work when implemented |
|---------|---------|--------|----------------------------------|
| 5.1 | Referral campaigns | **Pending** | Referral link generation, share UI, “Referred by” and reward status. |
| 5.2 | Outbound webhooks | **Pending** | Settings: webhook URL, events to subscribe, API key display/rotate. |
| 5.3 | Notifications (email/SES) | **Pending** | Notification preferences (email on/off, in-app if applicable). |
| 5.4 | Merchant payments (Razorpay) | **Pending** | UI to initiate Razorpay payment (e.g. paid reward, top-up) and view payment status. |
| 5.5 | Gamification (badges, challenges) | **Pending** | Badges/challenges list, progress, completion triggers. |
| 5.6 | Advanced analytics | **Pending** | Reporting page with Recharts: cohorts, redemption trends, KPIs (when API exists). |
| 5.7 | Offline / POS | **Pending** | Docs and optional “Batch upload” or reconciliation UI. |

---

## Technical & performance (optional)

| Item | Feature | Status | Notes |
|------|---------|--------|--------|
| — | Code-splitting (lazy routes) | **Done** | All page routes lazy-loaded with `React.lazy`; `Suspense` fallback in routes. |
| — | Dark mode toggle | **Done** | Theme select (Light / Dark / System) in header; persisted to `lp-theme`; `initTheme()` on load. |
| — | Language switcher + Hindi | **Done** | En / हिंदी select in header; `hi.ts` messages; persisted to `lp-locale`; `document.lang` synced. |

---

## Summary

| Phase / area | Implemented | Pending |
|--------------|-------------|---------|
| **Phase 2 (core)** | 7/7 | 0 (transaction history list when API ready) |
| **Phase 3 (frontend-relevant)** | 2/2 | 0 |
| **Phase 4 (frontend)** | 3/3 | 0 |
| **UX polish & testing** | 8 | 1 (transaction history list when API ready) |
| **Phase 5 (growth)** | 0 | 7 (all when backend is implemented) |
| **Technical (optional)** | 3 | 0 |

**Bottom line:** All Phase 2–4 frontend task features are **implemented**. Optional items (a11y, lazy routes, dark mode, language switcher) are **done**. Pending: **transaction history list** (blocked on API) and **Phase 5 UI** (when each 5.x backend is done).
