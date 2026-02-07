# Component library

Reusable UI components for the Loyalty Platform web app (`packages/web`). Built with **React** (functional components), **Tailwind CSS**, and **Radix UI** primitives where used. Styling uses the [design system](DESIGN_SYSTEM.md) tokens.

---

## Location

All base UI components live under:

```
packages/web/src/components/
├── layout/          # App shell, navigation
│   ├── AppShell.tsx
│   └── ProtectedLayout.tsx
└── ui/              # Design-system primitives
    ├── button.tsx
    ├── card.tsx
    ├── input.tsx
    ├── label.tsx
    ├── select.tsx
    ├── skeleton.tsx
    └── tabs.tsx
```

---

## UI primitives (`components/ui/`)

| Component | File | Description |
|-----------|------|-------------|
| **Button** | `button.tsx` | Primary actions. Variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`. Sizes: `default`, `sm`, `lg`, `icon`. Uses `ring-ring` for focus. Optional `asChild` (Radix Slot). |
| **Card** | `card.tsx` | Container with border, shadow, hover. Subcomponents: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`. Use for summaries, forms, lists. |
| **Input** | `input.tsx` | Text input with `border-input`, focus ring. Use with `Label` and `htmlFor`. |
| **Label** | `label.tsx` | Form label; use with `htmlFor` and input `id` for a11y. |
| **Select** | `select.tsx` | Dropdown (Radix Select). Subcomponents: `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue`. Use for single-choice (e.g. program, type filter). |
| **Skeleton** | `skeleton.tsx` | Loading placeholder (`animate-pulse`, `bg-muted`). Use for loading states instead of spinners where appropriate. |
| **Tabs** | `tabs.tsx` | Tabbed UI (Radix Tabs). Subcomponents: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`. Use for Catalog / Redeem, etc. |

---

## Layout components

| Component | File | Description |
|-----------|------|-------------|
| **AppShell** | `layout/AppShell.tsx` | Main layout: sidebar (collapsible on mobile), top bar, tenant display, theme/locale switchers, sign out. Renders `Outlet` for page content. |
| **ProtectedLayout** | `layout/ProtectedLayout.tsx` | Wraps authenticated routes; redirects to login if not authenticated. |

---

## Usage guidelines

1. **Import from `@/components/ui/*`** (e.g. `import { Button } from "@/components/ui/button"`).
2. **Use design tokens:** Prefer `className="bg-card border-border text-muted-foreground"` over arbitrary colors.
3. **Accessibility:** Pair `Label` with inputs; add `aria-label` on icon-only buttons; use semantic HTML.
4. **Loading/empty/error:** Use `Skeleton` for loading; clear empty state copy (e.g. “No transactions yet”); inline or toast for errors.
5. **Forms:** Use `Label` + `Input` or `Select`; disable submit while loading; show validation errors inline.

---

## Tests

- `button.test.tsx`, `card.test.tsx` exist under `components/ui/`. Add tests for new components and for critical variants.

For new components, follow the same patterns (Tailwind + tokens, forwardRef where needed, Radix when appropriate). See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for tokens and [DEVELOPMENT_STANDARDS.md](DEVELOPMENT_STANDARDS.md) for UX principles.
