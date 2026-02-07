import { Link, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-14 max-w-6xl items-center gap-4 px-4">
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
          <Link
            to="/"
            className="flex items-center gap-2 font-semibold text-foreground no-underline hover:text-foreground"
          >
            <span className="text-lg tracking-tight">{t("app.title")}</span>
          </Link>
          <nav
            className={cn(
              "hidden flex-1 items-center gap-1 lg:flex",
              "lg:flex"
            )}
            aria-label="Main navigation"
          >
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive =
                path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(path);
              return (
                <Link key={path} to={path} onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "gap-2",
                      isActive && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                    )}
                  >
                    <Icon className="h-4 w-4" data-icon="inline-start" />
                    {label}
                  </Button>
                </Link>
              );
            })}
          </nav>
          <div className="flex flex-1 items-center justify-end gap-2 lg:flex-none">
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger
                className="w-[100px] border-border bg-background"
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
                className="w-[130px] border-border bg-background"
                aria-label={t("theme.aria")}
              >
                {theme === "light" && <Sun className="mr-2 h-4 w-4 shrink-0" />}
                {theme === "dark" && <Moon className="mr-2 h-4 w-4 shrink-0" />}
                {theme === "system" && <Monitor className="mr-2 h-4 w-4 shrink-0" />}
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <Sun className="mr-2 h-4 w-4" />
                  {t("theme.light")}
                </SelectItem>
                <SelectItem value="dark">
                  <Moon className="mr-2 h-4 w-4" />
                  {t("theme.dark")}
                </SelectItem>
                <SelectItem value="system">
                  <Monitor className="mr-2 h-4 w-4" />
                  {t("theme.system")}
                </SelectItem>
              </SelectContent>
            </Select>
            <span
              className="max-w-[180px] truncate text-sm text-muted-foreground"
              title="Signed in"
            >
              {tenantContext}
            </span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" data-icon="inline-start" />
              {t("nav.signOut")}
            </Button>
          </div>
        </div>
        {/* Mobile nav */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-border bg-card lg:hidden"
            >
              <nav className="flex flex-col gap-1 p-4" aria-label="Mobile navigation">
                {navItems.map(({ path, label, icon: Icon }) => {
                  const isActive =
                    path === "/"
                      ? location.pathname === "/"
                      : location.pathname.startsWith(path);
                  return (
                    <Link
                      key={path}
                      to={path}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        size="sm"
                        className={cn(
                          "w-full justify-start gap-2",
                          isActive && "bg-primary/10 text-primary"
                        )}
                      >
                        <Icon className="h-4 w-4" data-icon="inline-start" />
                        {label}
                      </Button>
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      <main
        id="main-content"
        className="flex-1 px-4 py-6"
        role="main"
      >
        <div className="container max-w-6xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <footer className="border-t border-border py-4 text-center text-sm text-muted-foreground">
        Loyalty Platform &middot; Support: support@loyalty.example.com &middot; +91 1234567890
      </footer>
    </div>
  );
}
