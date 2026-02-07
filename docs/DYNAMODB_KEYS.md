# DynamoDB key design (single-table)

Single table: `loyalty-{environment}`. All access is tenant-scoped; no query spans multiple tenants. Design is future-ready for analytics (tenant-wide transaction queries via GSI1).

## Table keys

| Key | Type | Description |
|-----|------|-------------|
| **pk** | String (partition key) | Partition key; format depends on entity (see below). |
| **sk** | String (sort key) | Sort key; format depends on entity. |

## GSI1 (analytics)

| Key | Type | Description |
|-----|------|-------------|
| **gsi1pk** | String (partition key) | `TENANT#<tenantId>` for tenant-scoped queries. |
| **gsi1sk** | String (sort key) | `TXN#<programId>#<timestamp>#<transactionId>` for transaction list by time. |

Use GSI1 to list all transactions for a tenant (e.g. reporting, exports, analytics). Projection: ALL.

---

## Entity patterns

### Tenant

| pk | sk | Attributes (example) |
|----|-----|----------------------|
| `TENANT#<tenantId>` | `TENANT` | name, planId, razorpaySubscriptionId, billingStatus, currentPeriodEnd, createdAt, updatedAt |

- **Access:** GetItem(pk=TENANT#<id>, sk=TENANT).

---

### Program

| pk | sk | Attributes (example) |
|----|-----|----------------------|
| `TENANT#<tenantId>` | `PROGRAM#<programId>` | name, currency, earnRules, burnRules, tierConfig, createdAt, updatedAt |

- **Access:** GetItem(pk=TENANT#<tenantId>, sk=PROGRAM#<programId>). List programs: Query(pk=TENANT#<tenantId>, sk BeginsWith PROGRAM#).

---

### Member

| pk | sk | Attributes (example) |
|----|-----|----------------------|
| `TENANT#<tenantId>#PROGRAM#<programId>` | `MEMBER#<memberId>` | email?, externalId?, tier?, createdAt, updatedAt |

- **Access:** GetItem(pk=..., sk=MEMBER#<memberId>). List members: Query(pk=TENANT#<tenantId>#PROGRAM#<programId>, sk BeginsWith MEMBER#).

---

### Balance

| pk | sk | Attributes (example) |
|----|-----|----------------------|
| `TENANT#<tenantId>#PROGRAM#<programId>` | `BALANCE#<memberId>` | points, updatedAt |

- **Access:** GetItem(pk=TENANT#<tenantId>#PROGRAM#<programId>, sk=BALANCE#<memberId>).

---

### Transaction (earn / burn / redemption)

| pk | sk | gsi1pk | gsi1sk | Attributes (example) |
|----|-----|--------|--------|----------------------|
| `TENANT#<tenantId>#PROGRAM#<programId>` | `TXN#<isoTimestamp>#<transactionId>` | `TENANT#<tenantId>` | `TXN#<programId>#<isoTimestamp>#<transactionId>` | type, memberId, points, rewardId?, idempotencyKey?, createdAt |

- **Access (by program + member):** Query(pk=TENANT#<tenantId>#PROGRAM#<programId>, sk BeginsWith TXN#, FilterExpression memberId = :memberId) or use a sparse GSI if needed for member-level history.
- **Access (tenant-wide for analytics):** Query GSI1 where gsi1pk=TENANT#<tenantId>, gsi1sk BeginsWith TXN#. Returns all transactions for the tenant, sorted by time.

Use ISO 8601 timestamp in sk (e.g. 2025-02-07T12:00:00.000Z) so sort order is chronological.

---

### Reward

| pk | sk | Attributes (example) |
|----|-----|----------------------|
| `TENANT#<tenantId>#PROGRAM#<programId>` | `REWARD#<rewardId>` | name, pointsCost, tierEligibility?, createdAt, updatedAt |

- **Access:** GetItem(pk=..., sk=REWARD#<rewardId>). List rewards: Query(pk=TENANT#<tenantId>#PROGRAM#<programId>, sk BeginsWith REWARD#).

---

## Access patterns summary

| Use case | Operation | Key condition |
|----------|-----------|----------------|
| Get tenant | GetItem | pk=TENANT#<id>, sk=TENANT |
| List programs | Query | pk=TENANT#<id>, sk BeginsWith PROGRAM# |
| Get program | GetItem | pk=TENANT#<id>, sk=PROGRAM#<programId> |
| List members | Query | pk=TENANT#<id>#PROGRAM#<programId>, sk BeginsWith MEMBER# |
| Get member | GetItem | pk=..., sk=MEMBER#<memberId> |
| Get balance | GetItem | pk=TENANT#<id>#PROGRAM#<programId>, sk=BALANCE#<memberId> |
| List transactions (program + member) | Query | pk=TENANT#<id>#PROGRAM#<programId>, sk BeginsWith TXN# (filter by memberId in app or add GSI later) |
| List transactions (tenant-wide, analytics) | Query GSI1 | gsi1pk=TENANT#<id>, gsi1sk BeginsWith TXN# |
| List rewards | Query | pk=TENANT#<id>#PROGRAM#<programId>, sk BeginsWith REWARD# |
| Get reward | GetItem | pk=..., sk=REWARD#<rewardId> |

---

## Tenant isolation

- Every pk either starts with `TENANT#<tenantId>` or (for program-scoped entities) includes it. Lambda must derive tenantId from JWT or API key and never from request body for authorization.
- No GetItem/Query/BatchGet spans more than one tenant.

---

## References

- [ARCHITECTURE.md](ARCHITECTURE.md) — DynamoDB and tenant scope.
- [ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md) — Data model diagram.
