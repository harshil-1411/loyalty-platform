import { useEffect, useState, useMemo } from "react";
import { Search, Users, X, Shield, UserCheck } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listUsers,
  listTenants,
  type PlatformUser,
  type Tenant,
  type UserStatus,
} from "@/api/superadmin";
import { cn } from "@/lib/utils";

/* ---- status helpers ---- */
const USER_STATUS_STYLES: Record<UserStatus, string> = {
  confirmed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  unconfirmed: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  disabled: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const USER_STATUS_LABELS: Record<UserStatus, string> = {
  confirmed: "Confirmed",
  unconfirmed: "Unconfirmed",
  disabled: "Disabled",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "Never";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function UserManagement() {
  const [allUsers, setAllUsers] = useState<PlatformUser[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [u, t] = await Promise.all([listUsers(), listTenants()]);
      if (!cancelled) {
        setAllUsers(u);
        setTenants(t);
        setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let result = allUsers;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.tenantName.toLowerCase().includes(q)
      );
    }
    if (tenantFilter !== "all") {
      result = result.filter((u) => u.tenantId === tenantFilter);
    }
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }
    return result;
  }, [allUsers, search, tenantFilter, roleFilter]);

  const hasFilters = search !== "" || tenantFilter !== "all" || roleFilter !== "all";

  function clearFilters() {
    setSearch("");
    setTenantFilter("all");
    setRoleFilter("all");
  }

  if (loading) {
    return (
      <div role="status" aria-live="polite" aria-busy="true">
        <p className="sr-only">Loading users…</p>
        <Skeleton className="mb-1 h-8 w-40" />
        <Skeleton className="mb-6 h-4 w-72" />
        <Skeleton className="mb-4 h-10 w-full max-w-sm" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div aria-labelledby="users-heading">
      <div className="mb-6">
        <h1 id="users-heading" className="text-xl font-semibold tracking-tight text-foreground">
          User Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {allUsers.length} {allUsers.length === 1 ? "user" : "users"} across all tenants.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            placeholder="Search by name, email, or tenant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search users"
          />
        </div>
        <Select value={tenantFilter} onValueChange={setTenantFilter}>
          <SelectTrigger className="w-[180px]" aria-label="Filter by tenant">
            <SelectValue placeholder="Tenant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tenants</SelectItem>
            {tenants.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[150px]" aria-label="Filter by role">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="mb-3 h-10 w-10 text-muted-foreground/40" aria-hidden />
            <p className="font-medium text-foreground">No users found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasFilters ? "Try adjusting your filters." : "No users have registered yet."}
            </p>
            {hasFilters && (
              <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Desktop header */}
          <div className="hidden rounded-md border border-border bg-muted/50 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground lg:grid lg:grid-cols-[1.5fr_2fr_1.5fr_1fr_1fr_1fr]">
            <span>Username</span>
            <span>Email</span>
            <span>Tenant</span>
            <span>Role</span>
            <span>Status</span>
            <span className="text-right">Last Sign-in</span>
          </div>

          {filtered.map((user) => (
            <div
              key={user.id}
              className="rounded-lg border border-border bg-card"
            >
              {/* Desktop row */}
              <div className="hidden items-center px-4 py-3 lg:grid lg:grid-cols-[1.5fr_2fr_1.5fr_1fr_1fr_1fr]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate text-sm font-medium text-foreground">{user.username}</span>
                </div>
                <span className="truncate text-sm text-muted-foreground">{user.email}</span>
                <span className="truncate text-sm text-foreground">{user.tenantName}</span>
                <span className="flex items-center gap-1.5 text-sm text-foreground">
                  {user.role === "super_admin" ? (
                    <>
                      <Shield className="h-3.5 w-3.5 text-primary" aria-hidden />
                      Super
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      Admin
                    </>
                  )}
                </span>
                <span>
                  <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-medium leading-tight", USER_STATUS_STYLES[user.status])}>
                    {USER_STATUS_LABELS[user.status]}
                  </span>
                </span>
                <span className="text-right text-sm text-muted-foreground">
                  {formatDateTime(user.lastSignIn)}
                </span>
              </div>

              {/* Mobile card */}
              <div className="space-y-2 p-4 lg:hidden">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      {user.role === "super_admin" && <Shield className="h-3.5 w-3.5 text-primary" aria-hidden />}
                      {user.username}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <span className={cn("shrink-0 inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-medium leading-tight", USER_STATUS_STYLES[user.status])}>
                    {USER_STATUS_LABELS[user.status]}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{user.tenantName}</span>
                  <span>{user.role === "super_admin" ? "Super Admin" : "Tenant Admin"}</span>
                  <span>Last: {formatDateTime(user.lastSignIn)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
