import { useEffect, useState, useMemo } from "react";
import { Users, Shield, UserCheck, MoreHorizontal, UserX, UserCheck2, KeyRound } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  listUsers,
  listTenants,
  disableUser,
  enableUser,
  resetUserPassword,
  type PlatformUser,
  type Tenant,
} from "@/api/superadmin";
import { Pagination, PAGE_SIZE_DEFAULT } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterBar } from "@/components/ui/filter-bar";
import { toast } from "sonner";

function formatDateTime(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Never";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function UserActionMenu({
  user,
  loading,
  onAction,
}: {
  user: PlatformUser;
  loading: string | null;
  onAction: (action: "disable" | "enable" | "reset", user: PlatformUser) => void;
}) {
  const isDisabled = user.status === "disabled";
  const isLoading = loading?.startsWith(`disable-${user.username}`) ||
    loading?.startsWith(`enable-${user.username}`) ||
    loading?.startsWith(`reset-${user.username}`);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={!!isLoading}
          aria-label={`Actions for ${user.username}`}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {isDisabled ? (
          <DropdownMenuItem onClick={() => onAction("enable", user)}>
            <UserCheck2 className="mr-2 h-4 w-4 text-green-600" aria-hidden />
            Enable
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => onAction("disable", user)}
            className="text-destructive focus:text-destructive"
          >
            <UserX className="mr-2 h-4 w-4" aria-hidden />
            Disable
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAction("reset", user)}>
          <KeyRound className="mr-2 h-4 w-4" aria-hidden />
          Reset Password
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserManagement() {
  const [allUsers, setAllUsers] = useState<PlatformUser[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function handleAction(
    action: "disable" | "enable" | "reset",
    user: PlatformUser
  ) {
    const key = `${action}-${user.username}`;
    setActionLoading(key);
    try {
      if (action === "disable") {
        await disableUser(user.username);
        setAllUsers((prev) =>
          prev.map((u) => u.id === user.id ? { ...u, status: "disabled" } : u)
        );
        toast.success(`${user.username} disabled.`);
      } else if (action === "enable") {
        await enableUser(user.username);
        setAllUsers((prev) =>
          prev.map((u) => u.id === user.id ? { ...u, status: "confirmed" } : u)
        );
        toast.success(`${user.username} enabled.`);
      } else {
        await resetUserPassword(user.username);
        toast.success(`Password reset email sent to ${user.email}.`);
      }
    } catch {
      toast.error("Action failed. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [u, t] = await Promise.all([listUsers(), listTenants()]);
        if (!cancelled) {
          setAllUsers(u);
          setTenants(t);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load users");
          setLoading(false);
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [retryKey]);

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

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE_DEFAULT;
    return filtered.slice(start, start + PAGE_SIZE_DEFAULT);
  }, [filtered, page]);

  const hasFilters = search !== "" || tenantFilter !== "all" || roleFilter !== "all";

  function clearFilters() {
    setSearch("");
    setTenantFilter("all");
    setRoleFilter("all");
    setPage(1);
  }

  useEffect(() => {
    setPage(1);
  }, [search, tenantFilter, roleFilter]);

  if (error) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-foreground">User Management</h1>
        <div className="mt-6 rounded-lg border border-border bg-card p-6" role="alert">
          <p className="font-medium text-foreground">Failed to load users.</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => { setError(""); setLoading(true); setRetryKey((k) => k + 1); }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
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
      <FilterBar
        className="mb-6"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, email, or tenant…"
        searchAriaLabel="Search users"
        hasFilters={hasFilters}
        onClear={clearFilters}
        selects={[
          {
            value: tenantFilter,
            onValueChange: setTenantFilter,
            "aria-label": "Filter by tenant",
            triggerClassName: "w-[180px]",
            options: [
              { value: "all", label: "All Tenants" },
              ...tenants.map((t) => ({ value: t.id, label: t.name })),
            ],
          },
          {
            value: roleFilter,
            onValueChange: setRoleFilter,
            "aria-label": "Filter by role",
            triggerClassName: "w-[150px]",
            options: [
              { value: "all", label: "All Roles" },
              { value: "super_admin", label: "Super Admin" },
              { value: "tenant_admin", label: "Tenant Admin" },
            ],
          },
        ]}
      />

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
        <>
          <div className="space-y-2">
            {/* Desktop header */}
            <div className="hidden rounded-md border border-border bg-muted/50 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground lg:grid lg:grid-cols-[1.5fr_2fr_1.5fr_1fr_1fr_1fr_auto]">
              <span>Username</span>
              <span>Email</span>
              <span>Tenant</span>
              <span>Role</span>
              <span>Status</span>
              <span className="text-right">Last Sign-in</span>
              <span />
            </div>

            {paginated.map((user) => (
            <div
              key={user.id}
              className="rounded-lg border border-border bg-card"
            >
              {/* Desktop row */}
              <div className="hidden items-center px-4 py-3 lg:grid lg:grid-cols-[1.5fr_2fr_1.5fr_1fr_1fr_1fr_auto]">
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
                  <StatusBadge variant="user" status={user.status} />
                </span>
                <span className="text-right text-sm text-muted-foreground">
                  {formatDateTime(user.lastSignIn)}
                </span>
                <UserActionMenu
                  user={user}
                  loading={actionLoading}
                  onAction={handleAction}
                />
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
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge variant="user" status={user.status} />
                    <UserActionMenu
                      user={user}
                      loading={actionLoading}
                      onAction={handleAction}
                    />
                  </div>
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
          <Pagination
            totalItems={filtered.length}
            pageSize={PAGE_SIZE_DEFAULT}
            page={page}
            onPageChange={setPage}
            className="mt-4"
            aria-label="User list pagination"
          />
        </>
      )}
    </div>
  );
}
