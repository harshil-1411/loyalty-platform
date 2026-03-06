# Loyalty Platform — API Adjustments Required for Salon Integration

> **Purpose:** Pre-integration audit of the Loyalty Platform APIs against the Salon Automation integration plan.
> **Date:** 2026-03-02
> **Scope:** Analysis only — no code changes. References `salon-loyalty-integration-plan.md`.

---

## 1. API Readiness Matrix

| API | Endpoint | Functionally Correct? | Production-Safe? | Salon Plan Depends On It? |
|-----|----------|:---------------------:|:-----------------:|:-------------------------:|
| Earn points | `POST /programs/{id}/earn` | Yes | **No** — idempotency broken, not atomic | Yes (core) |
| Burn points | `POST /programs/{id}/burn` | Yes | **No** — race condition on balance check | Yes |
| Get balance | `GET /programs/{id}/balance/{memberId}` | Yes | Yes | Yes |
| List transactions | `GET /programs/{id}/transactions` | Yes | Yes | No (nice-to-have) |
| Redeem reward | `POST /programs/{id}/redeem` | Yes | **No** — same race condition as burn | No |
| Create member | — | **Does not exist** | — | Yes (implicit) |
| API key auth | — | **Does not exist** | — | Yes (auth strategy) |
| Outbound webhooks | — | **Does not exist** | — | No (future) |

**Verdict:** The APIs the Salon system calls *exist and return correct responses*, but the earn and burn operations have data-integrity issues that must be fixed before external systems depend on them.

---

## 2. Critical Fix: Idempotency Is Broken

**Salon plan assumption:** `idempotencyKey` (set to `invoiceId`) provides server-side deduplication — if the Salon system retries after a timeout, points are not awarded twice.

**Actual behavior:** Duplicate points ARE awarded.

### Root Cause

**File:** `packages/backend/src/app/services/transactions.py`, lines 25–55

```python
txn_id = idempotency_key or _txn_id()              # line 30 — key used as ID only
now = time.strftime(...)                             # line 31 — timestamp changes per call
sk_txn = key.txn_sk(now, txn_id)                     # line 32 — sort key: TXN#{now}#{txn_id}
tbl.update_item(...)                                 # line 34 — balance += points (ALWAYS runs)
tbl.put_item(Item={"pk": pk, "sk": sk_txn, ...})    # line 39 — transaction record
```

**Problem:** The sort key includes the current timestamp. Two requests with the same `idempotencyKey` sent at different times produce different sort keys (`TXN#2026-03-02T10:00:00#INV_123` vs `TXN#2026-03-02T10:00:05#INV_123`). Both succeed — the balance is incremented twice and two transaction records are created.

### Suggested Fix

Use a **conditional PutItem** on a dedicated idempotency record, checked *before* the balance update:

```
Step 1:  PutItem IDEM#{idempotencyKey} with ConditionExpression="attribute_not_exists(pk)"
         → If exists: return cached response (409 or original 200)
         → If new: proceed to step 2

Step 2:  transact_write_items([
           Update balance (earn),
           Put transaction record,
         ])

Step 3:  Update IDEM#{idempotencyKey} with response + TTL (24h)
```

Alternative (simpler): Use `ConditionExpression="attribute_not_exists(sk)"` on the transaction PutItem with a **fixed sort key** that does not include the timestamp:

```python
# Change from:
sk_txn = key.txn_sk(now, txn_id)          # TXN#{now}#{txn_id} — unique per call

# Change to (when idempotencyKey is provided):
sk_txn = f"IDEM#{idempotency_key}"         # Fixed — same key always = same sort key
# PutItem with ConditionExpression="attribute_not_exists(sk)"
# If duplicate: ConditionalCheckFailedException → return 409
```

### Impact on Salon Plan

The Salon plan sets `idempotencyKey = invoiceId` and retries 3 times with backoff. Without this fix, every retry awards points again. **This is the highest-priority fix.**

---

## 3. Critical Fix: Earn/Burn Atomicity

**File:** `packages/backend/src/app/services/transactions.py`

### Problem

Balance update and transaction record are two independent DynamoDB calls:

```
earn():  update_item(balance += pts)  →  put_item(TXN record)  →  get_item(balance)
         ↑ 3 separate operations, no transaction wrapper
```

If `put_item` fails (throttle, network error) after `update_item` succeeds:
- Balance is incremented
- No transaction record exists (no audit trail)
- Client receives 500 error, retries, and (without idempotency fix) doubles the balance

### Suggested Fix

Replace the two operations with `transact_write_items`:

```python
from app.db import get_client  # need low-level client for transact_write_items

get_client().transact_write_items(
    TransactItems=[
        {
            "Update": {
                "TableName": TABLE,
                "Key": {"pk": {"S": pk}, "sk": {"S": sk_balance}},
                "UpdateExpression": "SET points = if_not_exists(points, :zero) + :pts, updatedAt = :now",
                "ExpressionAttributeValues": {...},
            }
        },
        {
            "Put": {
                "TableName": TABLE,
                "Item": {... transaction record ...},
                "ConditionExpression": "attribute_not_exists(pk)",  # idempotency guard
            }
        },
    ]
)
```

**Note:** `transact_write_items` uses the low-level client (not the Table resource). The existing `db/client.py` exposes `get_resource()` but would also need to expose the low-level `get_client()`.

### Same Issue in Rewards

**File:** `packages/backend/src/app/services/rewards.py`, lines 81–99

The `redeem()` function has the same non-atomic pattern: `update_item` then `put_item`.

---

## 4. Critical Fix: Burn/Redeem Race Condition

**File:** `packages/backend/src/app/services/transactions.py`, lines 58–89

### Problem

```python
res = _table().get_item(Key=...)                  # line 63 — read balance
current = res.get("Item", {}).get("points", 0)    # line 64
if current < points:                               # line 65 — check
    raise BadRequestError(...)                     # line 66
# ... time passes, concurrent request could modify balance ...
tbl.update_item(                                   # line 71 — update (no condition)
    UpdateExpression="SET points = points - :pts",
)
```

Two concurrent burn requests for 60 points each (balance = 100):
1. Request A reads balance: 100. Passes check.
2. Request B reads balance: 100. Passes check.
3. Request A writes: 100 - 60 = 40.
4. Request B writes: 40 - 60 = **-20**. Negative balance.

### Suggested Fix

Add `ConditionExpression` to the `update_item` call:

```python
tbl.update_item(
    Key={"pk": pk, "sk": sk_balance},
    UpdateExpression="SET points = points - :pts, updatedAt = :now",
    ConditionExpression="points >= :pts",            # ← atomic guard
    ExpressionAttributeValues={":pts": points, ":now": now},
)
# Catch botocore.exceptions.ClientError where Code == "ConditionalCheckFailedException"
# → raise BadRequestError("Insufficient balance")
```

This makes the check-and-update a single atomic operation. The separate `get_item` + `if` check can remain as an early-exit optimization, but the `ConditionExpression` is the real guard.

**Same fix needed in:** `rewards.py` `redeem()` function, line 81.

---

## 5. Multi-Tenant Isolation Audit

### Data Layer — Secure

All DynamoDB queries scope by tenant partition key:
```
PK: TENANT#{tenantId}                          → programs
PK: TENANT#{tenantId}#PROGRAM#{programId}      → balances, transactions, rewards
```

Cross-tenant data access is structurally impossible — a query for `TENANT#A` cannot return items from `TENANT#B`. This is correctly implemented.

### Auth Layer — One Fix Needed

**Issue:** `X-Tenant-Id` header overrides authorizer context.

**File:** `packages/backend/src/app/deps.py`, line 16:
```python
tenant = (x_tenant_id or "").strip() or getattr(request.state, "tenant_id", None)
```

The header is checked **first**. If an authenticated user sends `X-Tenant-Id: other-tenant`, the backend uses it instead of the tenant from their JWT. API Gateway v2 does not strip custom headers.

**Suggested Fix:** Reverse the priority — authorizer context first, header as fallback:
```python
tenant = getattr(request.state, "tenant_id", None) or (x_tenant_id or "").strip()
```

Or for API-key auth (where there's no authorizer context), allow the header only when `request.state.tenant_id` is not set.

### Summary

| Layer | Status | Notes |
|-------|--------|-------|
| DynamoDB partitioning | Secure | Tenant ID in every partition key |
| JWT → tenant binding | Secure | Cognito `custom:tenant_id` set at user creation |
| Lambda authorizer | Secure | Validates JWT signature, expiry, audience, issuer |
| Backend header handling | **Fix needed** | Header can override authorizer; reverse priority |
| Tenant existence check | **Missing** | No check that tenant actually exists in DynamoDB |

---

## 6. Secure API Key Per Business

### Current State

No API key infrastructure exists. All auth flows through Cognito JWT + Lambda authorizer.

### Proposed Design

```
Salon System                         Loyalty Platform
────────────                         ─────────────────
X-API-Key: sk_live_abc...     →      API Gateway
                                         ↓
                                     Lambda Authorizer (extended)
                                         ├─ Authorization: Bearer ... → JWT path (existing)
                                         └─ X-API-Key: sk_...        → API key path (new)
                                                ↓
                                         Hash key → lookup in DynamoDB
                                         Return context: { tenantId, programId }
                                         ↓
                                     FastAPI backend (unchanged)
```

### DynamoDB Schema for API Keys

```
PK: API_KEY#{sha256(key)}
SK: API_KEY
Fields:
  tenantId:    string     (maps key → tenant)
  programId:   string     (optional: scope key to one program)
  name:        string     (human label, e.g., "Glamour Salon Production")
  createdAt:   string
  lastUsedAt:  string
  isActive:    boolean
  rateLimit:   number     (per-key rate limit, optional)
```

### Key Format

```
sk_live_{32 random hex chars}
sk_test_{32 random hex chars}
```

- Prefix `sk_live_` / `sk_test_` distinguishes environments
- 32 hex chars = 128 bits of entropy (sufficient for API keys)
- Keys are hashed (SHA-256) before storage — the raw key is never stored

### Authorizer Changes

**File to modify:** `packages/infra/authorizer/handler.py`

```python
def handler(event, context):
    token = get_token(event)       # Existing: check Bearer header
    api_key = get_api_key(event)   # New: check X-API-Key header

    if token:
        return validate_jwt(token)          # Existing path
    elif api_key:
        return validate_api_key(api_key)    # New path
    else:
        return {"isAuthorized": False}
```

The `validate_api_key` function:
1. Hash the incoming key: `sha256(api_key)`
2. `GetItem` from DynamoDB: `PK=API_KEY#{hash}, SK=API_KEY`
3. Check `isActive == True`
4. Return `{ isAuthorized: True, context: { tenantId, programId } }`
5. Update `lastUsedAt` asynchronously (fire-and-forget)

### Management APIs (Super-Admin)

```
POST   /api/v1/admin/tenants/{tenantId}/api-keys     → Generate new key (return raw key ONCE)
GET    /api/v1/admin/tenants/{tenantId}/api-keys     → List keys (masked, last 4 chars)
DELETE /api/v1/admin/tenants/{tenantId}/api-keys/{id} → Revoke key
```

### Rate Limiting Per Key

Current rate limiting is per-IP (`slowapi` with `get_remote_address`). For API keys, add per-key limiting:
- Extract key ID from authorizer context
- Use as rate limit key instead of IP
- Default: 60 req/min per key (stricter than per-IP)

---

## 7. Idempotent Points Addition — Full Contract

### What the Salon System Sends

```json
POST /api/v1/programs/{programId}/earn
X-API-Key: sk_live_abc123...
Content-Type: application/json

{
  "memberId": "phone:9876543210",
  "points": 13,
  "idempotencyKey": "INV_1709312345678_A8KF3G"
}
```

### Expected Behavior (After Fix)

| Scenario | Current Behavior | Required Behavior |
|----------|-----------------|-------------------|
| First request | 200 + balance updated | 200 + balance updated (same) |
| Retry with same `idempotencyKey` | **200 + balance updated AGAIN** | 200 + return cached response, balance unchanged |
| Retry with same key, different `points` | **200 + different points applied** | 409 Conflict (key already used with different payload) |
| Request without `idempotencyKey` | 200 + auto-generated txn_id | 200 + auto-generated txn_id (same, no dedup) |

### Response Contract

**First call:**
```json
HTTP 200
{
  "transactionId": "INV_1709312345678_A8KF3G",
  "balance": 113,
  "points": 13
}
```

**Duplicate call (same idempotencyKey, same payload):**
```json
HTTP 200
{
  "transactionId": "INV_1709312345678_A8KF3G",
  "balance": 113,
  "points": 13
}
```
(Identical response, no side effects.)

**Duplicate call (same idempotencyKey, different points):**
```json
HTTP 409
{
  "error": {
    "code": "CONFLICT",
    "message": "Idempotency key already used with different parameters"
  }
}
```

---

## 8. Webhook Proposal (Future — Outbound Notifications)

### Pattern

Follow the existing Razorpay inbound webhook pattern (`services/webhook_razorpay.py`) but in reverse — the Loyalty Platform sends signed HTTP POSTs to the Salon system.

### Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `points.earned` | After successful earn | `{ tenantId, programId, memberId, points, balance, transactionId, timestamp }` |
| `points.burned` | After successful burn | `{ tenantId, programId, memberId, points, balance, transactionId, timestamp }` |
| `reward.redeemed` | After successful redeem | `{ tenantId, programId, memberId, rewardId, pointsDeducted, balance, transactionId, timestamp }` |
| `member.created` | First earn for new member | `{ tenantId, programId, memberId, timestamp }` |

### Signature

Same HMAC-SHA256 as Razorpay inbound, but sent in the `X-Loyalty-Signature` header:

```
X-Loyalty-Signature: sha256={hmac_sha256(webhook_secret, raw_body)}
```

Salon system verifies:
```python
expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
if not hmac.compare_digest(expected, received_signature):
    return 400
```

### DynamoDB Schema for Webhook Config

```
PK: TENANT#{tenantId}
SK: WEBHOOK#{webhookId}
Fields:
  url:           string    (e.g., "https://salon-api.example.com/webhooks/loyalty")
  secret:        string    (HMAC secret, encrypted)
  events:        list      (e.g., ["points.earned", "points.burned"])
  isActive:      boolean
  createdAt:     string
  lastTriggered: string
  failureCount:  number
```

### Delivery

- Fire-and-forget from the main request path (do not block earn/burn response)
- 3 retries with exponential backoff (1s, 5s, 25s) via SQS dead-letter queue
- If 5 consecutive failures → auto-disable webhook, notify tenant admin

### Priority

**Low** — The Salon plan uses fire-and-forget `POST /earn` calls. Webhooks are only needed if the Salon system wants to receive real-time balance updates (e.g., display points on receipt). Can be deferred to Phase 2.

---

## 9. Adjustment Summary

### Must Fix Before Integration (Priority 1)

| # | Issue | File | Lines | Effort |
|---|-------|------|-------|--------|
| 1 | Fix idempotency — check key before processing | `services/transactions.py` | 25–55 | Medium |
| 2 | Make earn atomic — `transact_write_items` | `services/transactions.py` | 34–51 | Medium |
| 3 | Make burn atomic — add `ConditionExpression` | `services/transactions.py` | 71–74 | Small |
| 4 | Make redeem atomic — add `ConditionExpression` | `services/rewards.py` | 81–84 | Small |
| 5 | Fix tenant header priority — authorizer first | `deps.py` | 16 | Small |

### Must Build Before Integration (Priority 1)

| # | Feature | Scope |
|---|---------|-------|
| 6 | API key auth — key generation, storage, authorizer path | New: authorizer + DynamoDB schema + admin APIs |
| 7 | Per-key rate limiting | Modify: `main.py` rate limiter key function |

### Nice to Have (Priority 2)

| # | Feature | Scope |
|---|---------|-------|
| 8 | Member registration endpoint | New: `POST /programs/{id}/members` |
| 9 | Member lookup endpoint | New: `GET /programs/{id}/members/{id}` |
| 10 | Outbound webhooks | New: event dispatch, SQS, webhook config APIs |
| 11 | Tenant existence check on auth | Modify: authorizer or middleware |

---

## 10. What Does NOT Need to Change

- `GET /programs/{id}/balance/{memberId}` — works correctly, single read, no race conditions
- `GET /programs/{id}/transactions` — read-only, pagination works, no integrity concerns
- DynamoDB single-table key design — solid, tenant-isolated, future-ready
- Error response format — consistent, includes `request_id`, proper HTTP codes
- Razorpay webhook — well-implemented, good template for future webhooks
- CORS configuration — properly scoped per environment
- Security headers — adequate (`nosniff`, `DENY` frame)
