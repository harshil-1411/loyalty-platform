# Frontend stack (Loyalty Platform — packages/web)

The web app is built as a **premium, high-performance** SPA using the following stack and conventions.

## Technology stack

| Area | Choice |
|------|--------|
| **Framework** | React 19 (Vite 7) |
| **Language** | TypeScript (strict) |
| **Styling** | Tailwind CSS 3.4 + tailwindcss-animate |
| **Utilities** | tailwind-merge, clsx, class-variance-authority (CVA) |
| **Components** | Shadcn/UI (New York style, Neutral base) — Radix primitives + Tailwind |
| **Icons** | Lucide React |
| **Routing** | React Router DOM v7 — `createBrowserRouter`, `RouterProvider` |
| **State** | Zustand (global client state, e.g. UI store) |
| **Motion** | Framer Motion (micro-interactions, page transitions) |
| **Charts** | Recharts (when needed) |
| **Dates** | date-fns |
| **Testing** | Vitest (unit/integration), Playwright (E2E) |

## Design and code standards

- **Aesthetics:** Premium, clear hierarchy, subtle borders, consistent spacing, Inter font. No generic “Bootstrap” look.
- **Interactivity:** Hover states, focus-visible rings, smooth transitions (framer-motion / CSS).
- **Clean code:** Functional components, hooks, strict TypeScript (no `any`), small single-responsibility components.
- **Routing:** `createBrowserRouter` in `src/routes.tsx`; no legacy `<BrowserRouter>` wrapping.

## Key paths

- **Router:** `src/routes.tsx`
- **Layout:** `src/components/layout/AppShell.tsx`, `ProtectedLayout.tsx`
- **UI primitives:** `src/components/ui/` (Button, Card, Input, Label)
- **Utils:** `src/lib/utils.ts` — `cn()` (tailwind-merge + clsx)
- **Store:** `src/stores/ui.ts` — Zustand (e.g. mobile menu)
- **Theme:** `src/index.css` — Tailwind + Shadcn CSS variables (Neutral light/dark)

## Adding Shadcn components

```bash
cd packages/web && npx shadcn@latest add <component>
```

Ensure `components.json` points to New York style and Neutral base (already configured).

## Next steps

See **[FRONTEND_NEXT_STEPS.md](FRONTEND_NEXT_STEPS.md)** for recommended order: testing (Vitest + Playwright), UX polish (loading, toasts, dashboard), Phase 5 UI, and performance.

## Running

```bash
cd packages/web
npm install
npm run dev    # http://localhost:5173
npm run build
npm run lint
```
