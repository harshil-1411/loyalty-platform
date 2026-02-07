# Development standards

All work on the Loyalty Platform must follow these standards. Agents and developers should treat this as the single source of truth for quality and consistency.

---

## 1. UI / Frontend

### Design principles
- **User-first:** Clear hierarchy, minimal cognitive load, obvious next steps. Every screen should answer "what can I do here?"
- **Consistency:** Same patterns for similar actions (e.g. primary action = one style, secondary = another). Use the design system tokens (colors, spacing, typography) everywhere.
- **Accessibility (a11y):** WCAG 2.1 AA where applicable: sufficient contrast (4.5:1 for normal text), focus-visible states for keyboard users, semantic HTML (`<header>`, `<nav>`, `<main>`, `<button>`, `<label>`), and `aria-*` when needed. No interaction that works only with a mouse.
- **Responsive:** Mobile-first or at least three breakpoints (e.g. 640px, 768px, 1024px). Layout and nav must work on small screens (e.g. collapsible nav, stacked forms, touch-friendly targets ≥44px).
- **Performance:** Avoid layout thrash; lazy-load heavy routes if needed; keep above-the-fold content fast.

### Implementation
- Use **design tokens** (CSS custom properties) for color, spacing, typography, radius, shadow. No magic numbers in component CSS.
- **Typography:** Clear font stack; distinct heading levels (scale); readable line-height (e.g. 1.5 for body).
- **Forms:** Labels associated with inputs; inline validation where helpful; clear error messages; disabled and loading states.
- **Feedback:** Loading states for async actions; success/error toasts or inline messages; no dead clicks (buttons disabled while submitting).
- **Latest trends (reference):** Clean layouts, ample whitespace, subtle shadows/depth, rounded corners, clear CTAs. Avoid clutter and outdated skeuomorphism.

---

## 2. Backend / API

### Principles
- **RESTful:** Resource-oriented URLs (`/api/v1/programs`, `/api/v1/programs/:id`). Correct HTTP methods (GET, POST, PUT, DELETE) and status codes (200, 201, 400, 401, 404).
- **Tenant isolation:** Every request scoped by tenant (header or auth). No cross-tenant data access.
- **Idempotency:** For payments/mutations, support idempotency keys where the business requires it.
- **Errors:** Consistent error payload (e.g. `{ "error": "message" }`). Log with context; never expose internals to the client.
- **Security:** Validate input; use parameterized queries; no secrets in logs or responses.

### Implementation
- Versioned API prefix (e.g. `/api/v1/`). Document in OpenAPI or runbook.
- Lambda/handlers: thin routing layer; business logic in testable modules. Environment-based config (no hardcoded credentials).

---

## 3. Database

### Principles
- **Single source of truth:** No duplicated facts; derive when possible.
- **Keys and access patterns:** Design keys (PK/SK, GSI) for actual queries. Document in a key-design doc (e.g. DYNAMODB_KEYS.md).
- **Tenant in every key:** Partition by tenant (or tenant+entity) so multi-tenant queries are explicit and secure.
- **Idempotency:** Use idempotency keys or unique constraints where duplicate operations must be prevented.

### Implementation
- Naming: consistent, descriptive (e.g. `TENANT#<id>`, `PROGRAM#<id>`). Timestamps in ISO8601 or epoch as required.
- Indexes: only for real access patterns. Document why each GSI exists.

---

## 4. General / Agent behavior

- **Read before changing:** Check TASKS.md, PROGRESS.md, runbooks, and existing code before implementing.
- **Branch and merge:** Follow git-flow (feature from develop, merge with --no-ff). No direct commits to main/develop for feature work.
- **Tests and lint:** New code must be covered by unit/integration tests where appropriate; lint must pass.
- **Documentation:** Update runbooks, env docs, and architecture when adding config or flows. Keep PROGRESS.md and FAILED_TASKS.md updated.
- **Security:** Never commit secrets, API keys, or credentials. Rotate keys if exposed.
- **Incremental delivery:** Small, reviewable changes. Prefer "done and merged" over large unreviewed branches.

---

## 5. References

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [REST API design](https://restfulapi.net/)
- Project: [ARCHITECTURE.md](ARCHITECTURE.md), [DYNAMODB_KEYS.md](DYNAMODB_KEYS.md), [AGENT_RUNBOOK.md](AGENT_RUNBOOK.md)
