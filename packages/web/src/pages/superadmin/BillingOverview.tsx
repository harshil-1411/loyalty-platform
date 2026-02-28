import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  IndianRupee,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  Activity,
  Download,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getPlatformMetrics,
  getRevenueTrendSeries,
  getPlanDistribution,
  getSubscriptionEvents,
  type PlatformMetrics,
  type TimeSeriesPoint,
  type PlanDistribution,
  type SubscriptionEvent,
} from "@/api/superadmin";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricCard } from "@/components/ui/metric-card";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "var(--radius)",
  padding: "0.5rem 0.75rem",
  fontSize: "0.8125rem",
  boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
};

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function BillingOverview() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [revenue, setRevenue] = useState<TimeSeriesPoint[]>([]);
  const [plans, setPlans] = useState<PlanDistribution[]>([]);
  const [events, setEvents] = useState<SubscriptionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [m, r, p, e] = await Promise.all([
          getPlatformMetrics(),
          getRevenueTrendSeries(),
          getPlanDistribution(),
          getSubscriptionEvents(),
        ]);
        if (!cancelled) {
          setMetrics(m);
          setRevenue(r);
          setPlans(p);
          setEvents(e);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load billing data");
          setLoading(false);
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [retryKey]);

  function exportCSV() {
    const header = ["Tenant", "Event", "Plan", "Amount (INR)", "Date"]
    const rows = events.map((ev) => [
      ev.tenantName,
      ev.event,
      ev.plan,
      String(ev.amount),
      ev.date,
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "subscription-events.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  if (error) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-foreground">Billing Overview</h1>
        <div className="mt-6 rounded-lg border border-border bg-card p-6" role="alert">
          <p className="font-medium text-foreground">Failed to load billing data.</p>
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

  if (loading || !metrics) {
    return (
      <div role="status" aria-live="polite" aria-busy="true">
        <p className="sr-only">Loading billing overview…</p>
        <Skeleton className="mb-1 h-8 w-48" />
        <Skeleton className="mb-8 h-4 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[340px] rounded-lg" />
          <Skeleton className="h-[340px] rounded-lg" />
        </div>
      </div>
    );
  }

  const kpis = [
    { title: "Monthly Revenue", value: formatINR(metrics.mrr), icon: IndianRupee, change: `+${metrics.mrrGrowthPct}%` },
    { title: "Annual Run Rate", value: formatINR(metrics.arr), icon: TrendingUp },
    { title: "Active Subscriptions", value: String(metrics.activeSubscriptions), icon: CreditCard, sub: `${metrics.trialSubscriptions} trialing` },
    { title: "Past Due", value: String(metrics.pastDueCount), icon: AlertTriangle, warn: metrics.pastDueCount > 0 },
  ];

  return (
    <div aria-labelledby="billing-heading">
      <div className="mb-8">
        <h1 id="billing-heading" className="text-xl font-semibold tracking-tight text-foreground">
          Billing Overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide revenue, subscriptions, and recent billing events.
        </p>
      </div>

      {/* KPIs */}
      <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Billing metrics">
        {kpis.map(({ title, value, icon: Icon, change, sub, warn }) => (
          <MetricCard
            key={title}
            title={title}
            value={value}
            icon={Icon}
            change={change}
            sub={sub}
            warn={warn}
          />
        ))}
      </section>

      {/* Charts */}
      <section className="mb-8 grid gap-4 lg:grid-cols-2" aria-label="Billing charts">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Activity className="h-4 w-4 text-muted-foreground" aria-hidden />
              Revenue Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full" role="img" aria-label="Revenue chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="billingRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatINR(value), "Revenue"]} labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 500 }} />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#billingRevenueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Subscription Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
              <div className="h-52 w-52 shrink-0" role="img" aria-label="Plan breakdown">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={plans} dataKey="count" nameKey="plan" cx="50%" cy="50%" innerRadius={48} outerRadius={76} paddingAngle={3} strokeWidth={0}>
                      {plans.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-3 text-sm" aria-label="Plan legend">
                {plans.map((p, idx) => (
                  <li key={p.plan} className="flex items-center gap-2.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} aria-hidden />
                    <span className="text-foreground font-medium">{p.plan}</span>
                    <span className="text-muted-foreground tabular-nums">{p.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Recent subscription events */}
      <section aria-labelledby="events-heading">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 id="events-heading" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Subscription Events
          </h2>
          {events.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
              <Download className="h-3.5 w-3.5" aria-hidden />
              Export CSV
            </Button>
          )}
        </div>
        <Card>
          <CardContent className="p-0">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Tenant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Plan</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev, idx) => (
                    <tr key={ev.id} className={cn("border-b border-border last:border-0", idx % 2 === 0 && "bg-muted/30")}>
                      <td className="px-4 py-2.5 font-medium text-foreground">{ev.tenantName}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge variant="event" status={ev.event} />
                      </td>
                      <td className="px-4 py-2.5 capitalize text-foreground">{ev.plan}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{ev.amount > 0 ? formatINR(ev.amount) : "—"}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{formatDate(ev.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-border md:hidden">
              {events.map((ev) => (
                <div key={ev.id} className="space-y-1.5 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{ev.tenantName}</p>
                    <StatusBadge variant="event" status={ev.event} className="shrink-0" />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="capitalize">{ev.plan}</span>
                    {ev.amount > 0 && <span className="tabular-nums">{formatINR(ev.amount)}</span>}
                    <span>{formatDate(ev.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
