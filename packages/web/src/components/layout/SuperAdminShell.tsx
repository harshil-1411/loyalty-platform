import { Link, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Monitor,
  Sun,
  Tags,
  Users,
  X,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/auth/useAuth";
import { useUIStore, type Theme } from "@/stores/ui";
import { useLocaleStore, type Locale } from "@/stores/locale";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/admin", label: "Platform Overview", icon: LayoutDashboard, exact: true },
  { path: "/admin/tenants", label: "Tenants", icon: Building2 },
  { path: "/admin/plans", label: "Pricing Plans", icon: Tags },
  { path: "/admin/billing", label: "Billing", icon: CreditCard },
  { path: "/admin/users", label: "Users", icon: Users },
] as const;

export function SuperAdminShell() {
  const location = useLocation();
  const { state, signOut } = useAuth();
  const { mobileMenuOpen, setMobileMenuOpen, theme, setTheme } = useUIStore();
  const { locale, setLocale } = useLocaleStore();

  if (state.status !== "authenticated") return null;

  const { user } = state;

  function isActive(path: string, exact?: boolean) {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + "/");
  }

  /* ---- Shared nav rendering ---- */
  function renderNav(opts: { mobile?: boolean }) {
    return (
      <nav
        className="flex-1 space-y-0.5 px-3 py-4"
        aria-label={opts.mobile ? "Mobile navigation" : "Main navigation"}
      >
        {navItems.map(({ path, label, icon: Icon, ...rest }) => {
          const active = isActive(path, 'exact' in rest ? rest.exact : false);
          return (
            <Link
              key={path}
              to={path}
              onClick={opts.mobile ? () => setMobileMenuOpen(false) : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 text-[0.8125rem] font-medium transition-colors",
                opts.mobile ? "py-2.5 text-sm" : "py-2",
                active
                  ? "bg-sidebar-accent text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  /* ---- Shared sidebar footer ---- */
  function renderFooter(textSize = "text-[0.8125rem]") {
    return (
      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 flex items-center gap-2 px-3">
          <Shield className="h-3.5 w-3.5 shrink-0 text-sidebar-primary" aria-hidden />
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-sidebar-primary">
            Super Admin
          </span>
        </div>
        <div
          className="mb-3 truncate px-3 text-xs text-sidebar-foreground/60"
          title={user.email ?? user.username}
        >
          {user.email ?? user.username}
        </div>
        <button
          onClick={signOut}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            textSize
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {t("nav.signOut")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* ── Desktop sidebar ── */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex"
        aria-label="Sidebar navigation"
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-2.5 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <BarChart3 className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-[0.8125rem] font-semibold leading-tight text-sidebar-foreground tracking-tight">
              Loyalty Platform
            </span>
            <span className="text-[0.625rem] font-medium uppercase tracking-widest text-sidebar-foreground/50">
              Admin Console
            </span>
          </div>
        </div>

        {renderNav({ mobile: false })}
        {renderFooter()}
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-sidebar-border bg-sidebar lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              aria-label="Mobile navigation"
            >
              <div className="flex h-16 items-center justify-between px-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
                    <BarChart3 className="h-4 w-4 text-sidebar-primary-foreground" />
                  </div>
                  <span className="text-sm font-semibold text-sidebar-foreground">
                    Admin Console
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md p-1.5 text-sidebar-foreground hover:bg-sidebar-accent"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {renderNav({ mobile: true })}
              {renderFooter("text-sm")}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content area ── */}
      <div className="flex flex-1 flex-col lg:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger
                className="h-8 w-[90px] border-border bg-transparent text-xs"
                aria-label={t("locale.aria")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t("locale.en")}</SelectItem>
                <SelectItem value="hi">{t("locale.hi")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
              <SelectTrigger
                className="h-8 w-[100px] border-border bg-transparent text-xs"
                aria-label={t("theme.aria")}
              >
                {theme === "light" && <Sun className="mr-1.5 h-3.5 w-3.5 shrink-0" />}
                {theme === "dark" && <Moon className="mr-1.5 h-3.5 w-3.5 shrink-0" />}
                {theme === "system" && <Monitor className="mr-1.5 h-3.5 w-3.5 shrink-0" />}
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t("theme.light")}</SelectItem>
                <SelectItem value="dark">{t("theme.dark")}</SelectItem>
                <SelectItem value="system">{t("theme.system")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        {/* Page content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto px-4 py-6 lg:px-8"
          role="main"
        >
          <div className="mx-auto max-w-7xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
