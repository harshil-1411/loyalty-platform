# Frontend — Next steps

Recommended order for frontend work after the [premium stack upgrade](FRONTEND_STACK.md). Align with [DEVELOPMENT_STANDARDS.md](DEVELOPMENT_STANDARDS.md) and [TASKS.md](../TASKS.md).

---

## 1. Quality & testing (do first)

| Priority | Step | Done when |
|----------|------|-----------|
| **High** | **Unit tests (Vitest)** — Critical flows: auth (login/signup redirect), Programs CRUD, Transactions earn/burn, Rewards catalog + redeem, Billing plan selection. Mock API and auth. | `npm run test` passes with good coverage on pages and key hooks. |
| **High** | **E2E tests (Playwright)** — `e2e/` has smoke, login, navigation, performance, and critical flows. Auth-dependent flows (login→dashboard, programs, transactions, rewards) are skipped unless `E2E_AUTH=1` (Cognito configured). | `npm run test:e2e` passes; use `reuseExistingServer: true` or start dev server first. |
| **Medium** | **Accessibility (a11y)** — Audit with axe or Lighthouse; fix contrast, focus order, and aria where needed. Ensure keyboard-only and screen-reader friendly. | **Done:** axe E2E in `e2e/a11y.spec.ts` (WCAG 2.1 AA on login, signup, home); skip-link and focus-visible in place. Optional: manual Lighthouse or `npx @axe-core/cli` for full-site audit. |

---

## 2. UX polish & consistency

| Priority | Step | Done when |
|----------|------|-----------|
| **High** | **Loading & error states** — Skeleton loaders (Shadcn `Skeleton`) or spinners on list/detail views; consistent error boundaries or inline error messages; disable buttons while submitting. | Every async action has clear loading and error feedback. |
| **Medium** | **Toasts for success/error** — Add Shadcn Sonner (or Toast) for “Program created”, “Points earned”, “Redeemed”, “Subscription started” instead of only inline text. | Success/error toasts on main mutations. |
| **Medium** | **Dashboard with real value** — Replace placeholder with: quick stats (program count, total points issued this period if API supports), links to Programs / Transactions / Rewards. Optional: Recharts for a simple KPI chart when analytics API exists. | Dashboard feels useful and links to main actions. |
| **Low** | **Transaction history UI** — When backend supports listing transactions, add a table or list (Shadcn Table) on Transactions page with filters (date, type). | Users can see earn/burn history. |
| **Low** | **Shadcn Select & Tabs** — Replace native `<select>` with Shadcn Select where it improves UX (e.g. program/reward pickers); use Tabs for Rewards (Catalog / Redeem) if not already. | Consistent form controls and tabbed UIs. |

---

## 3. Phase 5 — Frontend for growth features

When implementing [Phase 5](PHASE5_FEATURES.md), add the corresponding UI:

| Phase 5 task | Frontend work |
|--------------|----------------|
| **5.1 Referral campaigns** | Referral link generation, share UI, optional “Referred by” and reward status. |
| **5.2 Outbound webhooks** | Settings page: webhook URL, events to subscribe, API key display/rotate. |
| **5.3 Notifications** | Notification preferences (email on/off, in-app if applicable). |
| **5.4 Merchant payments** | UI for initiating Razorpay payment (e.g. paid reward or top-up) and viewing payment status. |
| **5.5 Gamification** | Badges/challenges list, progress, and completion triggers. |
| **5.6 Advanced analytics** | Reporting page with Recharts: cohorts, redemption trends, KPIs (when API exists). |
| **5.7 Offline / POS** | Docs and optional “Batch upload” or reconciliation UI. |

---

## 4. Technical & performance

| Priority | Step | Done when |
|----------|------|-----------|
| **Medium** | **Code-splitting** — Lazy-load heavy routes (e.g. Billing, future Analytics) with `React.lazy` + `Suspense` to keep initial bundle smaller. | Main bundle &lt; ~400 KB gzipped where feasible. |
| **Low** | **Dark mode** — Shadcn theme already has `.dark` variables; add a theme toggle (e.g. in nav or footer) and persist preference. | Users can switch light/dark. |
| **Low** | **i18n** — Language switcher and Hindi (or next locale) if product requires; reuse existing i18n structure. | At least one extra locale works end-to-end. |

---

## Suggested order

1. **Vitest unit tests** for auth and core flows.  
2. **Loading/skeletons and toasts** for better feedback.  
3. **Playwright E2E** for happy paths (login → program → earn → redeem).  
4. **Dashboard** with real links and simple stats (or placeholders for future API).  
5. **A11y pass** and any Shadcn Select/Tabs refactors.  
6. **Phase 5 UI** as each backend task (5.1–5.7) is implemented.

After each step: run `npm run build` and `npm run lint`, update [PROGRESS.md](../PROGRESS.md) when merged to `develop`.
