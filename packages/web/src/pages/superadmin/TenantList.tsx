import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Building2, ArrowUpRight } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listTenants, type Tenant, type PlanKey } from "@/api/superadmin";
import { Pagination, PAGE_SIZE_DEFAULT } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/ui/data-table";

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
  const [page, setPage] = useState(1);

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

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE_DEFAULT;
    return filtered.slice(start, start + PAGE_SIZE_DEFAULT);
  }, [filtered, page]);

  const hasFilters = search !== "" || planFilter !== "all" || statusFilter !== "all";

  function clearFilters() {
    setSearch("");
    setPlanFilter("all");
    setStatusFilter("all");
    setPage(1);
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, planFilter, statusFilter]);

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
      <FilterBar
        className="mb-6"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, ID, or email…"
        searchAriaLabel="Search tenants"
        hasFilters={hasFilters}
        onClear={clearFilters}
        selects={[
          {
            value: planFilter,
            onValueChange: setPlanFilter,
            "aria-label": "Filter by plan",
            triggerClassName: "w-[140px]",
            options: [
              { value: "all", label: "All Plans" },
              { value: "starter", label: "Starter" },
              { value: "growth", label: "Growth" },
              { value: "scale", label: "Scale" },
              { value: "none", label: "No Plan" },
            ],
          },
          {
            value: statusFilter,
            onValueChange: setStatusFilter,
            "aria-label": "Filter by status",
            triggerClassName: "w-[150px]",
            options: [
              { value: "all", label: "All Statuses" },
              { value: "active", label: "Active" },
              { value: "trialing", label: "Trialing" },
              { value: "past_due", label: "Past Due" },
              { value: "cancelled", label: "Cancelled" },
              { value: "none", label: "None" },
            ],
          },
        ]}
      />

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
        <>
          <DataTable
            isEmpty={false}
            headerGridClass="hidden md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]"
            columns={[
              { header: "Tenant" },
              { header: "Plan" },
              { header: "Status" },
              { header: <span className="text-right">Members</span>, className: "text-right" },
              { header: <span className="text-right">Created</span>, className: "text-right" },
              { header: null, className: "w-8" },
            ]}
          >
            {paginated.map((tenant) => (
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
                  <StatusBadge variant="billing" status={tenant.billingStatus} />
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
                  <StatusBadge variant="billing" status={tenant.billingStatus} className="shrink-0" />
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{tenant.plan ? PLAN_LABELS[tenant.plan] : "No plan"}</span>
                  <span className="tabular-nums">{tenant.memberCount.toLocaleString("en-IN")} members</span>
                  <span>{formatDate(tenant.createdAt)}</span>
                </div>
              </div>
            </Link>
            ))}
          </DataTable>
          <Pagination
            totalItems={filtered.length}
            pageSize={PAGE_SIZE_DEFAULT}
            page={page}
            onPageChange={setPage}
            className="mt-4"
            aria-label="Tenant list pagination"
          />
        </>
      )}
    </div>
  );
}
