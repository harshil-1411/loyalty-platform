# Loyalty Platform Backend (Python FastAPI)

REST API for the Loyalty Management Platform. Serves `/api/v1/*` only. Uses DynamoDB (single-table design) and is deployable as AWS Lambda via Mangum.

## Setup

- Python 3.11+
- Create a virtual environment and install dependencies:

```bash
cd packages/backend
uv venv && source .venv/bin/activate  # or python -m venv .venv
uv pip install -e ".[dev]"           # or pip install -e ".[dev]"
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `TABLE_NAME` | DynamoDB table name (e.g. `loyalty-dev`) |
| `CORS_ORIGINS` | Comma-separated origins or `*` |
| `LOG_LEVEL` | DEBUG, INFO, WARNING, ERROR |
| `RATE_LIMIT_REQUESTS` | Max requests per window (default 100) |
| `RATE_LIMIT_WINDOW_SEC` | Window in seconds (default 60) |
| `RAZORPAY_WEBHOOK_SECRET` | For webhook signature verification |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | For subscription link |

## Run locally

```bash
export TABLE_NAME=loyalty-dev
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Then open http://localhost:8000/api/v1/hello and http://localhost:8000/api/v1/docs.

## OpenAPI spec

The OpenAPI 3.x spec is exported for **MCP (Model Context Protocol)** and **CodePlugins** consumption. Generated spec is available at `/api/v1/openapi.json` and can be written to `docs/openapi.yaml` (see task B.10).

## Tests

```bash
pytest
```

With coverage:

```bash
pytest --cov=app --cov-report=term-missing
```

## Lint

```bash
ruff check src
black --check src
```
