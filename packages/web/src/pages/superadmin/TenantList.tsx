import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Building2, ArrowUpRight, Plus, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listTenants, createTenant, type Tenant, type PlanKey } from "@/api/superadmin";
import { Pagination, PAGE_SIZE_DEFAULT } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/ui/data-table";
import { toast } from "sonner";

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

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

const BLANK_FORM = { name: "", slug: "", contactEmail: "", planId: "none", adminEmail: "", adminUsername: "" };

export function TenantList() {
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  /* ── Create form ── */
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  /* ── Filters ── */
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    listTenants()
      .then((data) => {
        if (!cancelled) {
          setAllTenants(data);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load tenants");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [retryKey]);

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

  function updateField(field: keyof typeof BLANK_FORM, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-slug from name if slug wasn't manually edited
      if (field === "name" && slugify(prev.name) === prev.slug) {
        next.slug = slugify(value);
      }
      return next;
    });
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.slug || !form.contactEmail) return;
    setCreating(true);
    setCreateError("");
    try {
      await createTenant({
        name:          form.name,
        slug:          form.slug,
        contactEmail:  form.contactEmail,
        planId:        form.planId !== "none" ? form.planId : null,
        adminEmail:    form.adminEmail || null,
        adminUsername: form.adminUsername || null,
      });
      toast.success(`Tenant "${form.name}" created successfully.`);
      setForm(BLANK_FORM);
      setShowCreate(false);
      setRetryKey((k) => k + 1);  // Refresh list
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create tenant");
    } finally {
      setCreating(false);
    }
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, planFilter, statusFilter]);

  /* ── Error ── */
  if (error) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-foreground">Tenants</h1>
        <div className="mt-6 rounded-lg border border-border bg-card p-6" role="alert">
          <p className="font-medium text-foreground">Failed to load tenants.</p>
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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 id="tenants-heading" className="text-xl font-semibold tracking-tight text-foreground">
            Tenants
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {allTenants.length} registered {allTenants.length === 1 ? "tenant" : "tenants"} on the platform.
          </p>
        </div>
        <Button size="sm" className="shrink-0" onClick={() => { setShowCreate((v) => !v); setCreateError(""); }}>
          {showCreate ? <X className="mr-1.5 h-3.5 w-3.5" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
          {showCreate ? "Cancel" : "Create Tenant"}
        </Button>
      </div>

      {/* ── Create Tenant form ── */}
      {showCreate && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">New Tenant</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitCreate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ct-name">Name *</Label>
                  <Input id="ct-name" placeholder="Acme Corp" value={form.name}
                    onChange={(e) => updateField("name", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ct-slug">Slug * <span className="text-xs text-muted-foreground">(used as tenant ID)</span></Label>
                  <Input id="ct-slug" placeholder="acme-corp" value={form.slug}
                    onChange={(e) => updateField("slug", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ct-email">Contact Email *</Label>
                  <Input id="ct-email" type="email" placeholder="admin@acme.in" value={form.contactEmail}
                    onChange={(e) => updateField("contactEmail", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Plan</Label>
                  <Select value={form.planId} onValueChange={(v) => updateField("planId", v)}>
                    <SelectTrigger><SelectValue placeholder="No Plan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Plan</SelectItem>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                      <SelectItem value="scale">Scale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ct-admin-email">Admin Email <span className="text-xs text-muted-foreground">(optional — creates Cognito user)</span></Label>
                  <Input id="ct-admin-email" type="email" placeholder="user@acme.in" value={form.adminEmail}
                    onChange={(e) => updateField("adminEmail", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ct-admin-user">Admin Username <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Input id="ct-admin-user" placeholder="acme.admin" value={form.adminUsername}
                    onChange={(e) => updateField("adminUsername", e.target.value)} />
                </div>
              </div>
              {createError && (
                <p className="text-sm text-destructive" role="alert">{createError}</p>
              )}
              <div className="flex items-center gap-2 pt-1">
                <Button type="submit" size="sm" disabled={creating || !form.name || !form.slug || !form.contactEmail}>
                  {creating ? "Creating…" : "Create Tenant"}
                </Button>
                <Button type="button" size="sm" variant="ghost"
                  onClick={() => { setShowCreate(false); setForm(BLANK_FORM); setCreateError(""); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

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
