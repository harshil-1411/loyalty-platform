# Frontend: Features, Test Coverage & Data Report

Consolidated report for the Loyalty Platform web app (`packages/web`). Generated from codebase and test run.

**Phase-wise implemented vs pending:** See [FRONTEND_FEATURES_STATUS.md](FRONTEND_FEATURES_STATUS.md) for a tabular list of frontend features by phase (implemented / pending).

---

## 1. Features vs unit test cases

| # | Feature / area | Description | Test file(s) | No. of test cases | Passed | Failed | Pass % | Fail % |
|---|----------------|-------------|--------------|-------------------|--------|--------|--------|--------|
| 1 | **Auth (useAuth)** | Auth context and hook | `auth/useAuth.test.tsx` | 2 | 2 | 0 | 100% | 0% |
| 2 | **Login** | Sign-in form, validation, redirect | `pages/Login.test.tsx` | 6 | 6 | 0 | 100% | 0% |
| 3 | **Sign up** | Create account, confirmation, errors | `pages/SignUp.test.tsx` | 6 | 6 | 0 | 100% | 0% |
| 4 | **Dashboard** | Basic dashboard when authenticated | `pages/Dashboard.test.tsx` | 3 | 3 | 0 | 100% | 0% |
| 5 | **Premium dashboard** | Metrics, charts, quick links, loading/error | `pages/PremiumDashboard.test.tsx` | 8 | 8 | 0 | 100% | 0% |
| 6 | **Programs (CRUD)** | List, create, edit, cancel, empty/error | `pages/Programs.test.tsx` | 7 | 7 | 0 | 100% | 0% |
| 7 | **Transactions** | Earn/burn points, balance, program select | `pages/Transactions.test.tsx` | 6 | 6 | 0 | 100% | 0% |
| 8 | **Rewards** | Catalog tab, add reward, Redeem tab, redeem flow | `pages/Rewards.test.tsx` | 7 | 7 | 0 | 100% | 0% |
| 9 | **Billing** | Plan status, plan selection, subscribe link | `pages/Billing.test.tsx` | 5 | 5 | 0 | 100% | 0% |
| 10 | **Contact** | Contact page and mail link | `pages/Contact.test.tsx` | 2 | 2 | 0 | 100% | 0% |
| 11 | **Programs API** | listPrograms, getProgram, create, update | `api/programs.test.ts` | 4 | 4 | 0 | 100% | 0% |
| 12 | **Transactions API** | getBalance, earn, burn | `api/transactions.test.ts` | 3 | 3 | 0 | 100% | 0% |
| 13 | **Rewards API** | listRewards, createReward, redeem | `api/rewards.test.ts` | 3 | 3 | 0 | 100% | 0% |
| 14 | **Billing API** | getBillingStatus, createSubscriptionLink | `api/billing.test.ts` | 2 | 2 | 0 | 100% | 0% |
| 15 | **Dashboard API** | getDashboardData (tenant-scoped) | `api/dashboard.test.ts` | 2 | 2 | 0 | 100% | 0% |
| 16 | **useDashboardMetrics** | Loading, data, error, empty tenantId | `hooks/useDashboardMetrics.test.ts` | 4 | 4 | 0 | 100% | 0% |
| 17 | **i18n** | t(), locale, formatINR, formatDateIndia | `i18n/index.test.ts` | 9 | 9 | 0 | 100% | 0% |
| 18 | **Utils (cn)** | class name merging | `lib/utils.test.ts` | 7 | 7 | 0 | 100% | 0% |
| 19 | **UI: Button** | Render, click, disabled, variant, ref | `components/ui/button.test.tsx` | 5 | 5 | 0 | 100% | 0% |
| 20 | **UI: Card** | Card structure (Header, Title, Content, Footer) | `components/ui/card.test.tsx` | 4 | 4 | 0 | 100% | 0% |
| 21 | **Smoke** | Critical pages load (Login, SignUp, Contact, Dashboard) | `smoke.test.tsx` | 4 | 4 | 0 | 100% | 0% |
|   | **Total (unit)** | | 21 test files | **99** | **99** | **0** | **100%** | **0%** |

---

## 2. E2E test cases (Playwright)

| # | E2E area | Spec file | No. of tests | Notes |
|---|----------|-----------|--------------|--------|
| 1 | Critical flows | `e2e/flows.spec.ts` | 5 | 1 always runs (login/signup); 4 skipped unless `E2E_AUTH=1` |
| 2 | Login | `e2e/login.spec.ts` | 3 | Sign-in form, signup link, validation |
| 3 | Navigation | `e2e/navigation.spec.ts` | 2 | Signup→sign in, unauthenticated / |
| 4 | App smoke | `e2e/app.smoke.spec.ts` | 3 | Home, login, signup accessible |
| 5 | **Performance** | `e2e/performance.spec.ts` | 2 | Login page &lt; 5s; home response &lt; 3s |
|   | **Total (E2E)** | | **15** | Run: `npm run test:e2e` in `packages/web` |

---

## 3. Performance testing

| Type | Location / tool | What is tested | Status |
|------|------------------|----------------|--------|
| **E2E performance (Playwright)** | `e2e/performance.spec.ts` | Login page loads within 5 s; home page HTTP response within 3 s | Implemented; run with `npm run test:e2e` |
| **Lighthouse / a11y** | Docs (AGENT_RUNBOOK, FRONTEND_NEXT_STEPS) | Suggested: Lighthouse or axe for accessibility and performance | Manual / optional; not automated in CI |
| **Load / stress (k6 etc.)** | — | Not present in frontend repo | Not implemented |
| **Backend performance** | PRD | API latency p95 &lt; 500 ms for create-program and apply-transaction | Backend concern; not frontend tests |

**Summary:** Frontend has **black-box E2E performance** (page load / response time) in Playwright only. No dedicated load or stress tests in the frontend package; Lighthouse/axe are recommended for manual audits.

---

## 4. Mock vs real data and APIs

| Context | Data / API | How it works |
|---------|------------|----------------|
| **Production / dev (real)** | **Real APIs, real data** | Frontend uses `VITE_API_URL` (config from `config.ts`). `api/client.ts` calls `fetch()` to that base URL. Backend (API + Lambda) reads/writes **DynamoDB**. No mock in production. |
| **Unit tests (Vitest)** | **Mocked APIs and auth** | `useAuth` and API modules are mocked (e.g. `vi.mock("@/auth/useAuth")`, `vi.mock` for API client or endpoints). Tests do **not** call DynamoDB or real HTTP. |
| **E2E (Playwright)** | **Configurable: mock or real** | Default: routes can be mocked (e.g. Cognito, `/api/*`) for deterministic CI. With real backend: set `VITE_API_URL` and optionally `E2E_AUTH=1` to use **real APIs and real data** (e.g. DynamoDB via backend). |

**Summary:**  
- **App in browser:** Real API base URL → real backend → **DynamoDB** (when configured).  
- **Unit tests:** **Mock data and mock APIs** only.  
- **E2E:** Can run with **mocked** responses or against **real** API (and thus real data).

---

## 5. Summary tables

### Unit tests by feature (counts)

| Feature | Test cases | Pass % | Fail % |
|---------|------------|--------|--------|
| Auth | 2 | 100% | 0% |
| Login | 6 | 100% | 0% |
| Sign up | 6 | 100% | 0% |
| Dashboard | 3 | 100% | 0% |
| Premium dashboard | 8 | 100% | 0% |
| Programs (page + API) | 7 + 4 | 100% | 0% |
| Transactions (page + API) | 6 + 3 | 100% | 0% |
| Rewards (page + API) | 7 + 3 | 100% | 0% |
| Billing (page + API) | 5 + 2 | 100% | 0% |
| Contact | 2 | 100% | 0% |
| Dashboard API + hook | 2 + 4 | 100% | 0% |
| i18n | 9 | 100% | 0% |
| Utils | 7 | 100% | 0% |
| UI (Button, Card) | 5 + 4 | 100% | 0% |
| Smoke | 4 | 100% | 0% |
| **Total** | **99** | **100%** | **0%** |

### Data and API usage

| Environment | API | Data source |
|-------------|-----|--------------|
| Production / dev app | Real (`VITE_API_URL`) | Real backend → DynamoDB |
| Unit tests | Mocked | In-memory mocks |
| E2E | Mocked or real | Configurable |

### Performance testing

| Kind | Present? | Where |
|------|----------|--------|
| E2E page load / response time | Yes | `e2e/performance.spec.ts` (2 tests) |
| Lighthouse / axe | Optional (docs) | Manual / runbook |
| Load / stress (k6, etc.) | No | — |

---

*Report generated from `packages/web` structure and Vitest JSON output. Re-run `npm run test -- --run --reporter=json` in `packages/web` to refresh pass/fail counts.*
