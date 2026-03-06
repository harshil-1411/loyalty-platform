# Loyalty Platform — Claude Code Guidelines

## Project Overview

Universal multi-tenant Loyalty SaaS platform. Monorepo with four packages:

| Package | Stack | Path |
|---------|-------|------|
| Backend | FastAPI 0.115 · Python 3.11 · DynamoDB · Mangum (Lambda) | `packages/backend/` |
| Frontend | React 19 · TypeScript · Vite · TailwindCSS · Zustand | `packages/web/` |
| API | TypeScript Lambda handlers · AWS SDK v3 | `packages/api/` |
| Infra | AWS CDK · TypeScript | `packages/infra/` |

Hierarchy: **Super Admin → Business (Tenant) → Customer (Member)**

---

## 1. Response Style

- Concise answers. No unnecessary theory or preambles.
- Show only modified files during implementation.
- Minimal verbosity — code over explanation.
- When suggesting changes, reference exact file paths and line numbers.
- Do not add docstrings, comments, or type annotations to unchanged code.

---

## 2. Architecture Rules

### Multi-Tenant Isolation

- `business_id` / `tenant_id` is **required in every query**. No exceptions.
- DynamoDB partition keys always include tenant: `TENANT#{tenantId}`.
- Never trust client-supplied tenant ID when authorizer context is available.
- Tenant resolution priority: authorizer context first → header fallback only for API-key auth.

### Ledger-Based Points

- All point mutations (earn, burn, redeem) create an immutable transaction record.
- Never update balance without a corresponding transaction entry.
- Balance updates and transaction writes must be **atomic** (`transact_write_items`).
- No balance-only logic — the ledger is the source of truth.

### Idempotency

- All external-facing write endpoints must support `idempotencyKey`.
- Idempotency keys produce **fixed sort keys** (no timestamp in key).
- Use `ConditionExpression="attribute_not_exists(pk)"` to reject duplicates.
- Duplicate requests return the cached original response, not a re-execution.

### Service-Layer Separation

```
routers/   → HTTP concerns (request parsing, response formatting, status codes)
services/  → Business logic (validation, orchestration, DynamoDB operations)
models/    → Pydantic schemas (request/response contracts)
db/        → DynamoDB client, key generation utilities
```

- Routers must not contain business logic.
- Services must not import FastAPI request/response objects.
- Models define strict Pydantic schemas for all inputs and outputs.

---

## 3. Security Rules

- **Validate all inputs** at the router level using Pydantic models.
- **Never expose internal IDs** (DynamoDB PKs/SKs) in API responses. Use public-facing identifiers.
- **Enforce API authentication** on every endpoint. No unauthenticated routes except health checks.
- **No sensitive data in logs** — mask API keys, tokens, PII. Use `logging_config.py` patterns.
- **Burn/redeem operations** must use `ConditionExpression` for atomic balance checks (prevent negative balances from race conditions).
- **API keys** are stored as SHA-256 hashes. Raw keys are returned only once at creation.
- **CORS** is scoped per environment. Do not use wildcard origins in production.

---

## 4. Integration Rules

- External systems (e.g., Salon Automation) authenticate via **API key** (`X-API-Key` header) or **JWT**.
- All integration-facing write endpoints must be **idempotent**.
- Design for **retry safety** — assume external callers will retry on timeout.
- Use `transact_write_items` for operations that must be atomic.
- Rate limiting is per-API-key for external integrations (default: 60 req/min).
- Webhook payloads are signed with HMAC-SHA256 (`X-Loyalty-Signature` header).

---

## 5. Safe Update Rules

- **No refactoring unrelated modules.** Touch only what the task requires.
- **Minimal, isolated changes.** Prefer small diffs over sweeping rewrites.
- **Preserve existing functionality.** Do not alter behavior of untouched code paths.
- **Run tests after changes.** Backend: `cd packages/backend && python -m pytest`. Frontend: `cd packages/web && npx vitest run`.
- **Do not add features** beyond what is explicitly requested.
- **Do not delete or rename** exports, variables, or functions that may have external consumers without verifying usage first.

---

## 6. Engineering Mode

Think like a SaaS platform serving **10,000+ businesses**:

- **Scalability** — DynamoDB single-table design, Lambda concurrency, no in-memory state across requests.
- **Maintainability** — Consistent patterns across all services. New endpoints should mirror existing ones.
- **Observability** — Structured JSON logging. Include `request_id`, `tenant_id`, `action` in every log entry.
- **Cost awareness** — Minimize DynamoDB read/write capacity. Use `ProjectionExpression` to fetch only needed attributes.
- **Failure handling** — Catch `ClientError` from boto3 and map to appropriate HTTP responses. Never swallow exceptions silently.

---

## Key File Reference

| Purpose | Path |
|---------|------|
| FastAPI app + Mangum handler | `packages/backend/src/app/main.py` |
| App config / env vars | `packages/backend/src/app/config.py` |
| DynamoDB client + connection | `packages/backend/src/app/db/client.py` |
| DynamoDB key utilities | `packages/backend/src/app/db/keys.py` |
| Dependency injection (tenant resolution) | `packages/backend/src/app/deps.py` |
| Custom exceptions | `packages/backend/src/app/exceptions.py` |
| DynamoDB schema docs | `docs/DYNAMODB_KEYS.md` |
| Architecture docs | `docs/ARCHITECTURE.md` |
| Development standards | `docs/DEVELOPMENT_STANDARDS.md` |
| Backend tests | `packages/backend/tests/` |
| Frontend tests | `packages/web/src/**/*.test.*` |
| CDK stack | `packages/infra/lib/loyalty-platform-stack.ts` |
| Lambda authorizer | `packages/infra/authorizer/handler.py` |

---

## Commands

```bash
# Backend
cd packages/backend && python -m pytest                 # run tests
cd packages/backend && python -m pytest --cov           # tests with coverage
cd packages/backend && ruff check src/                  # lint
cd packages/backend && black src/                       # format

# Frontend
cd packages/web && npx vitest run                       # run tests
cd packages/web && npx eslint src/                      # lint
cd packages/web && npx tsc --noEmit                     # type check

# Infra
cd packages/infra && npx cdk synth                      # synthesize stack
cd packages/infra && npx cdk diff                       # preview changes
```
