# Design system

The Loyalty Platform web app (`packages/web`) uses a **custom Tailwind design system** with CSS custom properties (tokens). No heavy UI frameworks (MUI, AntD, Bootstrap). Align with [DEVELOPMENT_STANDARDS.md](DEVELOPMENT_STANDARDS.md) for principles.

---

## 1. Design tokens

All tokens are defined in `packages/web/src/index.css` and referenced in `tailwind.config.ts`. Use Tailwind classes so tokens apply consistently.

### 1.1 Colors (HSL)

Tokens use HSL values without `hsl()` in CSS; Tailwind wraps them (e.g. `hsl(var(--background))`).

| Token | Light (default) | Dark | Usage |
|-------|------------------|------|--------|
| `--background` | 0 0% 100% | 0 0% 3.9% | Page background |
| `--foreground` | 0 0% 3.9% | 0 0% 98% | Body text |
| `--primary` | 0 0% 9% | 0 0% 98% | Primary buttons, links |
| `--primary-foreground` | 0 0% 98% | 0 0% 9% | Text on primary |
| `--secondary` | 0 0% 96.1% | 0 0% 14.9% | Secondary buttons, muted surfaces |
| `--muted` / `--muted-foreground` | 0 0% 96.1% / 45.1% | 14.9% / 63.9% | Subtle backgrounds, secondary text |
| `--accent` / `--accent-foreground` | 0 0% 96.1% / 9% | 14.9% / 98% | Hover states, accents |
| `--destructive` | 84.2% 60.2% (red) | 62.8% 30.6% | Errors, destructive actions |
| `--card` / `--card-foreground` | Card background and text | — | Cards |
| `--border`, `--input`, `--ring` | 0 0% 89.8% / 3.9% | 14.9% / 83.1% | Borders, inputs, focus ring |
| `--sidebar-*` | Sidebar palette | — | Sidebar nav |

**Tailwind usage:** `bg-background`, `text-foreground`, `bg-primary text-primary-foreground`, `border-border`, `text-muted-foreground`, `bg-destructive`, etc.

### 1.2 Border radius

| Token / class | Value | Use |
|---------------|--------|-----|
| `--radius` | 0.625rem (10px) | Base radius |
| `rounded-lg` | var(--radius) | Cards, modals |
| `rounded-md` | calc(var(--radius) - 2px) | Buttons, inputs |
| `rounded-sm` | calc(var(--radius) - 4px) | Badges, small elements |

### 1.3 Typography

- **Font:** `font-sans` → Inter, system-ui, sans-serif (in `tailwind.config.ts`).
- **Body:** `text-foreground`, default size; use `text-sm` for secondary copy.
- **Headings:** Semantic levels (h1–h3) with `font-semibold` / `tracking-tight` as needed; e.g. `text-2xl font-semibold` for page titles.
- **Line height:** Rely on Tailwind defaults; use `leading-tight` for headings if needed.

### 1.4 Spacing

Use Tailwind spacing scale (4px base): `space-y-2`, `space-y-4`, `space-y-6`, `gap-4`, `gap-6`, `p-4`, `p-6`, etc. Prefer 4/8/16/24/32 for consistency (e.g. `space-4` = 16px).

---

## 2. Dark mode

- **Strategy:** Class-based (`darkMode: ["class"]` in Tailwind). Root element gets `.dark` when user selects dark theme.
- **Persistence:** Theme stored in `lp-theme` (e.g. localStorage); applied on load.
- All color tokens have light and `.dark` overrides in `index.css`.

---

## 3. Accessibility

- **Focus:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background` on buttons, links, inputs, combobox, tabs (in `index.css`). No focus styling on mouse-only.
- **Skip link:** `.skip-link` — off-screen until keyboard focus; use for “Skip to main content”.
- **Contrast:** Tokens chosen for WCAG 2.1 AA; foreground on background and primary-foreground on primary meet contrast requirements.
- **Semantic HTML:** Use `<button>`, `<label>`, `<nav>`, `<main>`, `<header>`; associate labels with inputs; use `aria-label` where visible label is missing.

---

## 4. Animations

- **fade-in:** `animate-fade-in` — opacity 0→1, translateY(4px)→0, 0.25s. Use for gentle entry.
- **accordion:** Used by Radix accordion (if present); do not rely on for custom UI.

---

## 5. Responsive breakpoints

Tailwind defaults: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px. Use for:

- **Nav:** Collapsible sidebar on small screens; full sidebar from `md` up.
- **Tables:** Stacked cards or scroll on small viewports; full table from `md` (e.g. `hidden md:block` for table, `md:hidden` for card list).
- **Touch targets:** Minimum ~44px (e.g. `h-9` = 36px; use `h-11` or padding for critical tap targets on mobile).

---

## 6. Chart colors (Recharts)

`--chart-1` through `--chart-5` are defined in `index.css` (light and dark). Use for dashboard charts so they respect theme.

---

## 7. Do not use

- Magic numbers for color (use tokens).
- Decorative fonts or loud gradients.
- Interaction that works only with mouse (always support keyboard and focus-visible).

Reference: `packages/web/tailwind.config.ts`, `packages/web/src/index.css`, [COMPONENTS.md](COMPONENTS.md).
