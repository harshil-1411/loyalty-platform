import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Building2, ArrowUpRight, X } from "lucide-react";
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
import { listTenants, type Tenant, type BillingStatus, type PlanKey } from "@/api/superadmin";
import { cn } from "@/lib/utils";

/* ---- status badge config ---- */
const STATUS_STYLES: Record<BillingStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  trialing: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  past_due: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  cancelled: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  none: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<BillingStatus, string> = {
  active: "Active",
  trialing: "Trialing",
  past_due: "Past Due",
  cancelled: "Cancelled",
  none: "No Plan",
};

const PLAN_LABELS: Record<PlanKey, string> = {
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function TenantList() {
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Filters ── */
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    listTenants().then((data) => {
      if (!cancelled) {
        setAllTenants(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let result = allTenants;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.contactEmail.toLowerCase().includes(q)
      );
    }
    if (planFilter !== "all") {
      result = result.filter((t) => (planFilter === "none" ? t.plan === null : t.plan === planFilter));
    }
    if (statusFilter !== "all") {
      result = result.filter((t) => t.billingStatus === statusFilter);
    }
    return result;
  }, [allTenants, search, planFilter, statusFilter]);

  const hasFilters = search !== "" || planFilter !== "all" || statusFilter !== "all";

  function clearFilters() {
    setSearch("");
    setPlanFilter("all");
    setStatusFilter("all");
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div role="status" aria-live="polite" aria-busy="true">
        <p className="sr-only">Loading tenants…</p>
        <Skeleton className="mb-1 h-8 w-40" />
        <Skeleton className="mb-6 h-4 w-72" />
        <Skeleton className="mb-4 h-10 w-full max-w-sm" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div aria-labelledby="tenants-heading">
      {/* Header */}
      <div className="mb-6">
        <h1 id="tenants-heading" className="text-xl font-semibold tracking-tight text-foreground">
          Tenants
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {allTenants.length} registered {allTenants.length === 1 ? "tenant" : "tenants"} on the platform.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            placeholder="Search by name, ID, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search tenants"
          />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[140px]" aria-label="Filter by plan">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="growth">Growth</SelectItem>
            <SelectItem value="scale">Scale</SelectItem>
            <SelectItem value="none">No Plan</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trialing">Trialing</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="none">None</SelectItem>
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
            <Building2 className="mb-3 h-10 w-10 text-muted-foreground/40" aria-hidden />
            <p className="font-medium text-foreground">No tenants found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasFilters ? "Try adjusting your filters." : "No tenants have been registered yet."}
            </p>
            {hasFilters && (
              <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Desktop table header */}
          <div className="hidden rounded-md border border-border bg-muted/50 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
            <span>Tenant</span>
            <span>Plan</span>
            <span>Status</span>
            <span className="text-right">Members</span>
            <span className="text-right">Created</span>
            <span className="w-8" />
          </div>

          {filtered.map((tenant) => (
            <Link
              key={tenant.id}
              to={`/admin/tenants/${tenant.id}`}
              className="group block rounded-lg border border-border bg-card transition-colors hover:border-primary/20 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {/* Desktop row */}
              <div className="hidden items-center px-4 py-3.5 md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{tenant.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{tenant.contactEmail}</p>
                </div>
                <span className="text-sm text-foreground">
                  {tenant.plan ? PLAN_LABELS[tenant.plan] : <span className="text-muted-foreground">—</span>}
                </span>
                <span>
                  <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-medium leading-tight", STATUS_STYLES[tenant.billingStatus])}>
                    {STATUS_LABELS[tenant.billingStatus]}
                  </span>
                </span>
                <span className="text-right text-sm tabular-nums text-foreground">
                  {tenant.memberCount.toLocaleString("en-IN")}
                </span>
                <span className="text-right text-sm text-muted-foreground">
                  {formatDate(tenant.createdAt)}
                </span>
                <ArrowUpRight className="ml-2 h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
              </div>

              {/* Mobile card */}
              <div className="space-y-2 p-4 md:hidden">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{tenant.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{tenant.contactEmail}</p>
                  </div>
                  <span className={cn("shrink-0 inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-medium leading-tight", STATUS_STYLES[tenant.billingStatus])}>
                    {STATUS_LABELS[tenant.billingStatus]}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{tenant.plan ? PLAN_LABELS[tenant.plan] : "No plan"}</span>
                  <span className="tabular-nums">{tenant.memberCount.toLocaleString("en-IN")} members</span>
                  <span>{formatDate(tenant.createdAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
