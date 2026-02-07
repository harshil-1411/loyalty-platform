import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Gift,
  Receipt,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getTenantDetail,
  getTenantPrograms,
  type Tenant,
  type Program,
  type BillingStatus,
  type PlanKey,
} from "@/api/superadmin";
import { cn } from "@/lib/utils";

/* ---- shared helpers ---- */
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

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function TenantDetail() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [tenant, setTenant] = useState<Tenant | null | undefined>(undefined);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    async function load() {
      const [t, p] = await Promise.all([
        getTenantDetail(tenantId!),
        getTenantPrograms(tenantId!),
      ]);
      if (!cancelled) {
        setTenant(t ?? null);
        setPrograms(p);
        setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [tenantId]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div role="status" aria-live="polite" aria-busy="true">
        <p className="sr-only">Loading tenant details…</p>
        <Skeleton className="mb-4 h-5 w-32" />
        <Skeleton className="mb-2 h-8 w-64" />
        <Skeleton className="mb-8 h-4 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (tenant === null) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Building2 className="mb-3 h-10 w-10 text-muted-foreground/40" aria-hidden />
        <p className="text-lg font-medium text-foreground">Tenant not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No tenant with ID <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{tenantId}</code> exists.
        </p>
        <Button variant="outline" size="sm" className="mt-6" asChild>
          <Link to="/admin/tenants">Back to tenants</Link>
        </Button>
      </div>
    );
  }

  if (!tenant) return null;

  const statCards = [
    { title: "Programs", value: String(tenant.programCount), icon: Gift },
    { title: "Members", value: tenant.memberCount.toLocaleString("en-IN"), icon: Users },
    { title: "Transactions", value: tenant.transactionCount.toLocaleString("en-IN"), icon: Receipt },
    { title: "Monthly Revenue", value: formatINR(tenant.mrr), icon: CreditCard },
  ];

  return (
    <div aria-labelledby="tenant-detail-heading">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link to="/admin/tenants" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Tenants
        </Link>
        <span aria-hidden>/</span>
        <span className="font-medium text-foreground truncate">{tenant.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 id="tenant-detail-heading" className="text-xl font-semibold tracking-tight text-foreground">
              {tenant.name}
            </h1>
            <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium leading-tight", STATUS_STYLES[tenant.billingStatus])}>
              {STATUS_LABELS[tenant.billingStatus]}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {tenant.contactEmail} &middot; ID: {tenant.id} &middot; Joined {formatDate(tenant.createdAt)}
          </p>
        </div>
        {tenant.plan && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm font-medium text-foreground">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            {PLAN_LABELS[tenant.plan]} Plan
          </span>
        )}
      </div>

      {/* Stat cards */}
      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Tenant metrics">
        {statCards.map(({ title, value, icon: Icon }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {title}
              </CardTitle>
              <div className="rounded-md bg-primary/10 p-1.5" aria-hidden>
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold tabular-nums tracking-tight text-foreground" aria-label={`${title}: ${value}`}>
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* ── Overview tab ── */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Tenant Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {[
                  ["Tenant ID", tenant.id],
                  ["Slug", tenant.slug],
                  ["Contact Email", tenant.contactEmail],
                  ["Plan", tenant.plan ? PLAN_LABELS[tenant.plan] : "None"],
                  ["Billing Status", STATUS_LABELS[tenant.billingStatus]],
                  ["Created", formatDate(tenant.createdAt)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
                    <dd className="mt-1 text-sm text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Programs tab ── */}
        <TabsContent value="programs" className="space-y-3">
          {programs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Gift className="mb-3 h-8 w-8 text-muted-foreground/40" aria-hidden />
                <p className="font-medium text-foreground">No programs</p>
                <p className="mt-1 text-sm text-muted-foreground">This tenant has not created any loyalty programs yet.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="hidden rounded-md border border-border bg-muted/50 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr]">
                <span>Program</span>
                <span>Currency</span>
                <span className="text-right">Members</span>
                <span className="text-right">Created</span>
              </div>
              {programs.map((prog) => (
                <div
                  key={prog.id}
                  className="rounded-lg border border-border bg-card px-4 py-3"
                >
                  {/* Desktop */}
                  <div className="hidden items-center sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr]">
                    <div>
                      <p className="text-sm font-medium text-foreground">{prog.name}</p>
                      <p className="text-xs text-muted-foreground">{prog.id}</p>
                    </div>
                    <span className="text-sm text-foreground">{prog.currency}</span>
                    <span className="text-right text-sm tabular-nums text-foreground">{prog.memberCount.toLocaleString("en-IN")}</span>
                    <span className="text-right text-sm text-muted-foreground">{formatDate(prog.createdAt)}</span>
                  </div>
                  {/* Mobile */}
                  <div className="space-y-1 sm:hidden">
                    <p className="text-sm font-medium text-foreground">{prog.name}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{prog.currency}</span>
                      <span className="tabular-nums">{prog.memberCount.toLocaleString("en-IN")} members</span>
                      <span>{formatDate(prog.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </TabsContent>

        {/* ── Billing tab ── */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Subscription Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {[
                  ["Current Plan", tenant.plan ? PLAN_LABELS[tenant.plan] : "None"],
                  ["Billing Status", STATUS_LABELS[tenant.billingStatus]],
                  ["Monthly Revenue", formatINR(tenant.mrr)],
                  ["Subscription ID", tenant.id + "-sub"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
                    <dd className="mt-1 text-sm text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
