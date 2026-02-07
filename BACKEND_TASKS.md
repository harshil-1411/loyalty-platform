# Backend tasks (Python FastAPI)

Backend work for the Loyalty Platform. Pick a task with **no lock file** in `current_tasks/`. Create e.g. `current_tasks/B.1-backend-structure.lock` while working; remove after merge to `develop`. Append completion to [PROGRESS.md](PROGRESS.md). If stuck, add to [FAILED_TASKS.md](FAILED_TASKS.md) and remove the lock.

| ID | Task | Done when |
|----|------|-----------|
| B.1 | Set up initial Python backend structure (`packages/backend`: main.py, routers/, models/, services/, config/, deps.py, requirements or pyproject.toml, README). Base path `/api/v1`. | Layout exists; GET /api/v1/hello returns 200. |
| B.2 | DynamoDB: Boto3 client, config (TABLE_NAME from env), key helpers per [docs/DYNAMODB_KEYS.md](docs/DYNAMODB_KEYS.md). | Key helpers and table access work. |
| B.3 | Auth and tenant: tenant from JWT or X-Tenant-Id (authorizer); dependency enforces presence; 401 when missing/invalid. | Protected routes require tenant. |
| B.4 | Error handling: centralized handlers; error envelope `{ "error": { "code", "message" }, "request_id" }`; no stack in response. | All errors return consistent envelope. |
| B.5 | Logging: structured (JSON); request_id, tenant_id, path, method, status, duration; no secrets. | Logs parseable; level configurable. |
| B.6 | Rate limiting: per-tenant or per-IP; configurable; 429 + Retry-After; document in OpenAPI. | 429 when limit exceeded. |
| B.7 | API security: CORS allow list; security headers; Pydantic validation; webhook signature; secrets from env/SSM. | CORS and headers applied. |
| B.8 | Core REST endpoints: programs CRUD; earn/burn/balance; rewards list/create/redeem; billing status/subscription-link; POST /webhooks/razorpay. | All endpoints implemented and tested. |
| B.9 | List transactions: GET /programs/{id}/transactions (memberId, limit, pagination). | Endpoint returns transaction list. |
| B.10 | OpenAPI 3.x: full annotations; export to `docs/openapi.yaml`; tags, descriptions, examples; MCP/CodePlugins note. | Spec in repo; README links it. |
| B.11 | Tests: pytest, TestClient, moto; unit + integration; CI job (pytest, ruff, black). | Tests pass in CI. |
| B.12 | CDK: Replace Node Lambda with Python Lambda (container + Mangum) for `/api/v1/{proxy+}`; TABLE_NAME and IAM. | `cdk synth` succeeds; route to Python only. |
