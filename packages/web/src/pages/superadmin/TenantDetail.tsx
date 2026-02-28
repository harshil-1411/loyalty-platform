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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getTenantDetail,
  getTenantPrograms,
  changeTenantPlan,
  changeTenantStatus,
  getAuditLog,
  type Tenant,
  type Program,
  type PlanKey,
  type AuditLogEntry,
} from "@/api/superadmin";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricCard } from "@/components/ui/metric-card";
import { toast } from "sonner";

const PLAN_LABELS: Record<PlanKey, string> = {
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

const ACTION_LABELS: Record<string, string> = {
  plan_changed:   "Plan Changed",
  status_changed: "Status Changed",
  user_disabled:  "User Disabled",
  user_enabled:   "User Enabled",
  password_reset: "Password Reset",
  tenant_created: "Tenant Created",
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
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<string>("none");
  const [planSaving, setPlanSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  async function applyPlan() {
    if (!tenant) return;
    setPlanSaving(true);
    try {
      const plan = selectedPlan === "none" ? null : selectedPlan;
      await changeTenantPlan(tenant.id, plan);
      setTenant((prev) => prev ? { ...prev, plan: plan as PlanKey | null } : prev);
      toast.success("Plan updated successfully.");
    } catch {
      toast.error("Failed to update plan.");
    } finally {
      setPlanSaving(false);
    }
  }

  async function applyStatus(newStatus: "active" | "cancelled") {
    if (!tenant) return;
    setStatusSaving(true);
    try {
      await changeTenantStatus(tenant.id, newStatus);
      setTenant((prev) => prev ? { ...prev, billingStatus: newStatus } : prev);
      toast.success(newStatus === "cancelled" ? "Tenant suspended." : "Tenant reactivated.");
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setStatusSaving(false);
    }
  }

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    async function load() {
      try {
        const [t, p] = await Promise.all([
          getTenantDetail(tenantId!),
          getTenantPrograms(tenantId!),
        ]);
        if (!cancelled) {
          setTenant(t ?? null);
          setPrograms(p);
          setSelectedPlan(t?.plan ?? "none");
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load tenant details");
          setLoading(false);
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [tenantId, retryKey]);

  // Load audit log separately (non-blocking)
  useEffect(() => {
    if (!tenantId) return;
    setAuditLoading(true);
    getAuditLog(tenantId, 50)
      .then((entries) => setAuditLog(entries))
      .catch(() => {/* non-critical */})
      .finally(() => setAuditLoading(false));
  }, [tenantId, retryKey]);

  /* ── Error ── */
  if (error) {
    return (
      <div>
        <Button variant="ghost" size="sm" className="mb-4 gap-1" asChild>
          <Link to="/admin/tenants">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Tenants
          </Link>
        </Button>
        <div className="rounded-lg border border-border bg-card p-6" role="alert">
          <p className="font-medium text-foreground">Failed to load tenant details.</p>
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
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 id="tenant-detail-heading" className="text-xl font-semibold tracking-tight text-foreground">
              {tenant.name}
            </h1>
            <StatusBadge variant="billing" status={tenant.billingStatus} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {tenant.contactEmail} &middot; ID: {tenant.id} &middot; Joined {formatDate(tenant.createdAt)}
          </p>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Change plan */}
          <Select value={selectedPlan} onValueChange={setSelectedPlan}>
            <SelectTrigger className="h-9 w-[140px] text-sm" aria-label="Select plan">
              <CreditCard className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Plan</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
              <SelectItem value="scale">Scale</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={applyPlan}
            disabled={planSaving || selectedPlan === (tenant.plan ?? "none")}
          >
            {planSaving ? "Saving…" : "Apply Plan"}
          </Button>

          {/* Suspend / Reactivate */}
          {tenant.billingStatus === "cancelled" ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={statusSaving}>
                  Reactivate
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reactivate tenant?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will set <strong>{tenant.name}</strong>'s billing status back to active.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => applyStatus("active")}>Reactivate</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={statusSaving}>
                  Suspend
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Suspend tenant?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will cancel <strong>{tenant.name}</strong>'s subscription. They will lose access to paid features.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => applyStatus("cancelled")}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Suspend
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Tenant metrics">
        {statCards.map(({ title, value, icon: Icon }) => (
          <MetricCard key={title} title={title} value={value} icon={Icon} />
        ))}
      </section>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
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
                  ["Billing Status", <StatusBadge key="bs" variant="billing" status={tenant.billingStatus} />],
                  ["Created", formatDate(tenant.createdAt)],
                ].map(([label, value]) => (
                  <div key={label as string}>
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
                  ["Billing Status", <StatusBadge key="bs2" variant="billing" status={tenant.billingStatus} />],
                  ["Monthly Revenue", formatINR(tenant.mrr)],
                  ["Subscription ID", tenant.id + "-sub"],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
                    <dd className="mt-1 text-sm text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Activity tab ── */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Admin Activity Log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {auditLoading ? (
                <div className="space-y-2 p-4">
                  {[1,2,3].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}
                </div>
              ) : auditLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground">No admin actions recorded for this tenant yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {/* Header */}
                  <div className="hidden px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-[1fr_1fr_1fr_1fr]">
                    <span>Action</span>
                    <span>Actor</span>
                    <span>Details</span>
                    <span className="text-right">Date</span>
                  </div>
                  {auditLog.map((entry) => {
                    let detailText = "";
                    try {
                      const parsed = JSON.parse(entry.details || "{}");
                      detailText = Object.entries(parsed)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ");
                    } catch { detailText = entry.details; }
                    return (
                      <div key={entry.id} className="px-4 py-3 sm:grid sm:grid-cols-[1fr_1fr_1fr_1fr] sm:items-center">
                        <span className="text-sm font-medium text-foreground">
                          {ACTION_LABELS[entry.action] ?? entry.action}
                        </span>
                        <span className="text-sm text-muted-foreground">{entry.actor}</span>
                        <span className="text-sm text-muted-foreground truncate max-w-[200px]">{detailText || "—"}</span>
                        <span className="text-right text-xs text-muted-foreground">
                          {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(entry.createdAt))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
