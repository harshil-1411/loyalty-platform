import { Link, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  Gift,
  Receipt,
  Award,
  CreditCard,
  MessageCircle,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Monitor,
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
  { path: "/", label: t("nav.dashboard"), icon: LayoutDashboard },
  { path: "/programs", label: t("nav.programs"), icon: Gift },
  { path: "/transactions", label: t("nav.transactions"), icon: Receipt },
  { path: "/rewards", label: t("nav.rewards"), icon: Award },
  { path: "/billing", label: t("nav.billing"), icon: CreditCard },
  { path: "/contact", label: t("nav.contact"), icon: MessageCircle },
  { path: "/settings", label: t("nav.settings"), icon: Settings },
] as const;

export function AppShell() {
  const location = useLocation();
  const { state, signOut } = useAuth();
  const { mobileMenuOpen, setMobileMenuOpen, theme, setTheme } = useUIStore();
  const { locale, setLocale } = useLocaleStore();

  if (state.status !== "authenticated") return null;
  const tenantContext = state.user.email ?? state.user.username ?? "";

  function isActive(path: string) {
    return path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
  }

  return (
    <div className="flex min-h-screen bg-background">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* ── Sidebar (desktop) ── */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex"
        aria-label="Sidebar navigation"
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-2 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <span className="text-sm font-bold text-sidebar-primary-foreground">LP</span>
          </div>
          <span className="text-sm font-semibold text-sidebar-foreground tracking-tight">
            {t("app.title")}
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-0.5 px-3 py-4" aria-label="Main navigation">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = isActive(path);
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-[0.8125rem] font-medium transition-colors",
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

        {/* Sidebar footer: sign out */}
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-3 truncate px-3 text-xs text-sidebar-foreground/60" title={tenantContext}>
            {tenantContext}
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-[0.8125rem] font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {t("nav.signOut")}
          </button>
        </div>
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
                    <span className="text-sm font-bold text-sidebar-primary-foreground">LP</span>
                  </div>
                  <span className="text-sm font-semibold text-sidebar-foreground">{t("app.title")}</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md p-1.5 text-sidebar-foreground hover:bg-sidebar-accent"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 space-y-0.5 px-3 py-4" aria-label="Mobile navigation">
                {navItems.map(({ path, label, icon: Icon }) => {
                  const active = isActive(path);
                  return (
                    <Link
                      key={path}
                      to={path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
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
              <div className="border-t border-sidebar-border p-3">
                <div className="mb-3 truncate px-3 text-xs text-sidebar-foreground/60">{tenantContext}</div>
                <button
                  onClick={signOut}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  {t("nav.signOut")}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main area (offset by sidebar on desktop) ── */}
      <div className="flex flex-1 flex-col lg:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-8">
          {/* Mobile hamburger */}
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

          {/* Spacer */}
          <div className="flex-1" />

          {/* Controls */}
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
          <div className="mx-auto max-w-6xl">
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
