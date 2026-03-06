# Loyalty Platform — Integration Summary for Salon Automation

> **Purpose:** Technical reference for integrating an external Salon Automation system with this Loyalty Platform.
> **Date:** 2026-03-02
> **Scope:** Analysis only — no code changes.

---

## 1. Authentication Mechanism

| Layer | Technology | Details |
|-------|-----------|---------|
| Identity Provider | AWS Cognito User Pool | Handles sign-up, sign-in, password reset |
| Token Format | JWT (Cognito ID Token) | Contains `sub`, `cognito:groups`, `custom:tenant_id` |
| API Gateway | Lambda Authorizer | Validates JWT, extracts claims, injects tenant context |
| Backend | FastAPI middleware | Reads authorizer context from `request.state` |

**Roles:**

| Role | Cognito Mechanism | Access |
|------|------------------|--------|
| `tenant_admin` | `custom:tenant_id` attribute | All `/api/v1/programs/*` endpoints for their tenant |
| `super_admin` | `cognito:groups = ["super_admin"]` | All `/api/v1/admin/*` endpoints |
| Customer/Member | No direct auth | Accessed indirectly via tenant admin API calls |

**Tenant Isolation:**
- Every API request requires the `X-Tenant-Id` header (set automatically by the API Gateway authorizer from JWT claims).
- DynamoDB partition keys are prefixed with `TENANT#{tenantId}`, making cross-tenant queries structurally impossible.

**Key files:**
- `packages/backend/src/app/deps.py` — Auth dependencies (`get_tenant_id`, `require_super_admin`)
- `packages/backend/src/app/main.py` — Middleware (`_set_tenant_from_authorizer`)
- `packages/infra/authorizer/handler.py` — Lambda authorizer

---

## 2. Business Onboarding

**Flow:**
1. Super-admin calls `POST /api/v1/admin/tenants`
2. Backend creates DynamoDB tenant record
3. Optionally creates a Cognito admin user for the business
4. Tenant starts in `trialing` billing status

**Create Tenant Request:**
```json
POST /api/v1/admin/tenants
Authorization: Bearer <super_admin_jwt>

{
  "name": "Glamour Salon",
  "slug": "glamour-salon",
  "contactEmail": "owner@glamoursalon.com",
  "planId": "starter",
  "adminEmail": "admin@glamoursalon.com",
  "adminUsername": "glamour.admin"
}
```

**DynamoDB Record Created:**
```
PK: TENANT#{tenantId}    SK: TENANT
Fields: name, slug, contactEmail, planId, billingStatus="trialing",
        memberCount=0, programCount=0, transactionCount=0, mrr=0, createdAt
```

**Key file:** `packages/backend/src/app/services/superadmin.py`

---

## 3. API Authentication (Current State)

**Current:** Cognito JWT only — no API key or service-to-service auth.

```
┌──────────┐     JWT      ┌─────────────┐    context     ┌─────────┐
│  Client   │ ──────────▸ │ API Gateway  │ ────────────▸ │ FastAPI  │
│ (Browser) │             │ + Authorizer │               │ Backend  │
└──────────┘              └─────────────┘               └─────────┘
```

**Required headers for authenticated requests:**
```
Authorization: Bearer <cognito_id_token>
X-Tenant-Id: <tenant_uuid>              (auto-set by authorizer)
Content-Type: application/json
```

**Public (unauthenticated) endpoints:**
- `GET /api/v1/hello` — Health check
- `POST /api/v1/webhooks/razorpay` — Webhook (signature-verified)

**Security features:**
- Rate limiting: 100 req/60s per IP (configurable)
- CORS: Configurable origins
- Headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
- Request tracking: `X-Request-ID` on all responses

---

## 4. Customer/Member Model

**There is no standalone "Customer" entity.** Members are scoped to a specific program within a tenant.

**DynamoDB structure:**

| Entity | PK | SK | Fields |
|--------|----|----|--------|
| Member | `TENANT#{tid}#PROGRAM#{pid}` | `MEMBER#{memberId}` | email, externalId, tier, createdAt, updatedAt |
| Balance | `TENANT#{tid}#PROGRAM#{pid}` | `BALANCE#{memberId}` | points, updatedAt |

**Key behavior:**
- Members are **implicitly created** on the first `earn` call — the balance record is created via `if_not_exists(points, 0) + pts`.
- There is **no explicit member registration endpoint**.
- `memberId` is a free-form string supplied by the caller (could be phone, email, UUID, or external ID).
- Each member's balance is a denormalized single-item read (O(1) lookup).

**Key file:** `packages/backend/src/app/db/keys.py`

---

## 5. Points Calculation Logic

**Current state: Simple pass-through.** Points are provided directly in the request body — no rules engine evaluates them.

| Feature | Schema Field | Implemented? |
|---------|-------------|:------------:|
| Manual earn/burn | `points` in request | Yes |
| Rate-based earning (e.g. 1 pt / ₹100) | `earnRules` | Schema only |
| Tier multipliers | `tierConfig` | Schema only |
| Burn rules / restrictions | `burnRules` | Schema only |
| Idempotency (dedup earn) | `idempotencyKey` | Yes |

**Earn logic** (`packages/backend/src/app/services/transactions.py:25-55`):
```
Balance update:  SET points = if_not_exists(points, 0) + :pts
Transaction log: PutItem with type="earn"
```

**Burn logic** (`packages/backend/src/app/services/transactions.py:58-89`):
```
Pre-check:       GetItem → current balance >= requested points
Balance update:  SET points = points - :pts
Transaction log: PutItem with type="burn"
```

**Implication for Salon integration:** The Salon system must calculate the points value itself (e.g., ₹500 bill → 50 points) and pass the final integer to the earn API.

---

## 6. Transaction Ledger

**Pattern:** Append-only log + denormalized balance.

**DynamoDB structure:**

| Entity | PK | SK | Notes |
|--------|----|----|-------|
| Transaction | `TENANT#{tid}#PROGRAM#{pid}` | `TXN#{isoTimestamp}#{txnId}` | Immutable, 18-month TTL |
| Balance | `TENANT#{tid}#PROGRAM#{pid}` | `BALANCE#{memberId}` | Updated atomically on every earn/burn |

**Transaction record fields:**
```json
{
  "type": "earn | burn | redemption",
  "memberId": "string",
  "points": 100,
  "rewardId": "string | null",
  "idempotencyKey": "string | null",
  "createdAt": "2026-03-02T10:30:00.000Z",
  "ttl": 1803859200
}
```

**GSI1 (analytics):**
- `gsi1pk`: `TENANT#{tenantId}` — enables tenant-wide transaction queries
- `gsi1sk`: `TXN#{programId}#{isoTimestamp}#{txnId}`

**Key file:** `packages/backend/src/app/services/transactions.py`

---

## 7. Available APIs

### 7a. Ready APIs

All endpoints below are under the base path `/api/v1` and require `X-Tenant-Id` + JWT auth.

#### Add Points (Earn)
```
POST /api/v1/programs/{programId}/earn
```
**Request:**
```json
{
  "memberId": "phone:9876543210",
  "points": 50,
  "idempotencyKey": "salon-txn-abc123"
}
```
**Response (200):**
```json
{
  "transactionId": "txn_1709378400000_a1b2c3d4e",
  "balance": 150,
  "points": 50
}
```

---

#### Deduct Points (Burn)
```
POST /api/v1/programs/{programId}/burn
```
**Request:**
```json
{
  "memberId": "phone:9876543210",
  "points": 30
}
```
**Response (200):**
```json
{
  "transactionId": "txn_1709378500000_f5g6h7i8j",
  "balance": 120,
  "points": 30
}
```
**Error (400):** `{"error": {"code": "BAD_REQUEST", "message": "Insufficient balance (balance=20)"}}`

---

#### Redeem Reward
```
POST /api/v1/programs/{programId}/redeem
```
**Request:**
```json
{
  "memberId": "phone:9876543210",
  "rewardId": "reward_001"
}
```
**Response (200):**
```json
{
  "transactionId": "txn_...",
  "rewardId": "reward_001",
  "pointsDeducted": 100,
  "balance": 20
}
```

---

#### Get Balance
```
GET /api/v1/programs/{programId}/balance/{memberId}
```
**Response (200):**
```json
{
  "memberId": "phone:9876543210",
  "programId": "prog_001",
  "balance": 120
}
```

---

#### List Transactions
```
GET /api/v1/programs/{programId}/transactions?memberId=phone:9876543210&limit=50&nextToken=...
```
**Response (200):**
```json
{
  "transactions": [
    {
      "transactionId": "txn_...",
      "type": "earn",
      "memberId": "phone:9876543210",
      "points": 50,
      "rewardId": null,
      "createdAt": "2026-03-02T10:30:00.000Z"
    }
  ],
  "nextToken": null
}
```

---

### 7b. Missing APIs (Not Yet Built)

| Operation | Proposed Endpoint | Priority |
|-----------|-------------------|----------|
| Register member | `POST /api/v1/programs/{programId}/members` | **High** |
| Get member | `GET /api/v1/programs/{programId}/members/{memberId}` | **High** |
| Search member | `GET /api/v1/programs/{programId}/members?phone=...&email=...` | Medium |
| Update member | `PUT /api/v1/programs/{programId}/members/{memberId}` | Medium |

**Proposed "Register Member" payload:**
```json
POST /api/v1/programs/{programId}/members

{
  "memberId": "phone:9876543210",
  "email": "customer@example.com",
  "externalId": "salon-crm-id-456",
  "name": "Priya Sharma",
  "phone": "9876543210"
}
```

**Why this matters:** Currently members are created as side-effects of the first `earn` call, with no way to store profile data (name, phone, email) or look up a member before transacting.

---

## 8. Secure Integration Recommendation

### Recommended: API Key per Business

```
┌──────────────┐   API Key + memberId   ┌─────────────┐     ┌─────────┐
│    Salon     │ ─────────────────────▸ │ API Gateway  │ ──▸ │ Backend │
│  Automation  │                        │ (Key Auth)   │     │         │
└──────────────┘                        └─────────────┘     └─────────┘
```

**Why API key per business:**
- Simplest to implement — no token refresh, no OAuth dance
- Stateless — key maps directly to a `tenantId` + `programId`
- Fits multi-tenant model — each salon gets its own key
- Easy to rotate/revoke via DynamoDB or API Gateway usage plans
- Industry standard for B2B integrations

**Implementation sketch:**
1. Add `API_KEY#{keyHash}` records in DynamoDB mapping to `tenantId` + `programId`
2. Add a second Lambda authorizer (or extend existing) that validates `X-API-Key` header
3. Rate-limit per key (stricter than per-IP)
4. Keys created/revoked by tenant admin via dashboard

**Header format for Salon system:**
```
X-API-Key: sk_live_abc123def456...
Content-Type: application/json
```

### Alternative: Service-to-Service JWT

- Shared secret per tenant → Salon system signs short-lived JWTs
- More secure (tokens expire) but more complex to implement on Salon side
- Better if Salon system already has JWT infrastructure

### Webhook (Complementary)

For real-time notifications back to the Salon system:

| Event | Trigger | Payload |
|-------|---------|---------|
| `member.earn` | Points awarded | `{ memberId, points, balance, txnId }` |
| `member.burn` | Points deducted | `{ memberId, points, balance, txnId }` |
| `member.redeem` | Reward redeemed | `{ memberId, rewardId, pointsDeducted, balance }` |

Webhooks would use HMAC-SHA256 signature verification (same pattern as existing Razorpay webhook).

---

## Quick Reference: What the Salon System Needs

| Step | Action | API Exists? |
|------|--------|:-----------:|
| 1 | Business onboarded on Loyalty Platform | Yes (super-admin) |
| 2 | Salon system receives API key | **Not yet** |
| 3 | Register customer on first visit | **Not yet** |
| 4 | Award points after service | Yes (`POST .../earn`) |
| 5 | Check customer balance | Yes (`GET .../balance/{id}`) |
| 6 | Redeem points for discount | Yes (`POST .../burn`) |
| 7 | View transaction history | Yes (`GET .../transactions`) |

**Minimum to build before integration:**
1. API key authentication mechanism
2. Member registration endpoint (`POST /programs/{id}/members`)
3. Member lookup endpoint (`GET /programs/{id}/members/{id}`)
