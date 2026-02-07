import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  Building2,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Users,
  ArrowUpRight,
  IndianRupee,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getPlatformMetrics,
  getTenantGrowthSeries,
  getRevenueTrendSeries,
  getPlanDistribution,
  listTenants,
  type PlatformMetrics,
  type TimeSeriesPoint,
  type PlanDistribution,
  type Tenant,
} from "@/api/superadmin";

/* ---- chart style constants ---- */
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

/* ---- helpers ---- */
function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function PlatformDashboard() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [growth, setGrowth] = useState<TimeSeriesPoint[]>([]);
  const [revenue, setRevenue] = useState<TimeSeriesPoint[]>([]);
  const [plans, setPlans] = useState<PlanDistribution[]>([]);
  const [topTenants, setTopTenants] = useState<{ name: string; members: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [m, g, r, p, allTenants] = await Promise.all([
        getPlatformMetrics(),
        getTenantGrowthSeries(),
        getRevenueTrendSeries(),
        getPlanDistribution(),
        listTenants(),
      ]);
      if (!cancelled) {
        setMetrics(m);
        setGrowth(g);
        setRevenue(r);
        setPlans(p);
        setTopTenants(
          allTenants
            .slice()
            .sort((a: Tenant, b: Tenant) => b.memberCount - a.memberCount)
            .slice(0, 5)
            .map((t: Tenant) => ({ name: t.name, members: t.memberCount }))
        );
        setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  /* ── Loading skeleton ── */
  if (loading || !metrics) {
    return (
      <div role="status" aria-live="polite" aria-busy="true" aria-label="Loading dashboard">
        <p className="sr-only">Loading platform dashboard…</p>
        <Skeleton className="mb-1 h-8 w-56" />
        <Skeleton className="mb-8 h-4 w-80" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[132px] rounded-lg" />
          ))}
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[340px] rounded-lg" />
          <Skeleton className="h-[340px] rounded-lg" />
        </div>
      </div>
    );
  }

  /* ── KPI cards ── */
  const kpis = [
    {
      title: "Total Tenants",
      value: String(metrics.totalTenants),
      icon: Building2,
      to: "/admin/tenants",
      linkLabel: "View tenants",
    },
    {
      title: "Active Subscriptions",
      value: String(metrics.activeSubscriptions),
      sub: `${metrics.trialSubscriptions} trialing`,
      icon: CreditCard,
      to: "/admin/billing",
      linkLabel: "View billing",
    },
    {
      title: "Monthly Revenue",
      value: formatINR(metrics.mrr),
      change: `+${metrics.mrrGrowthPct}%`,
      positive: true,
      icon: IndianRupee,
      to: "/admin/billing",
      linkLabel: "Revenue details",
    },
    {
      title: "Annual Run Rate",
      value: formatINR(metrics.arr),
      icon: TrendingUp,
      to: "/admin/billing",
      linkLabel: "Revenue details",
    },
    {
      title: "Total Members",
      value: metrics.totalMembers.toLocaleString("en-IN"),
      icon: Users,
      to: "/admin/users",
      linkLabel: "View users",
    },
    {
      title: "Churn Rate",
      value: `${metrics.churnPct}%`,
      sub: `${metrics.pastDueCount} past due`,
      negative: true,
      icon: TrendingDown,
      to: "/admin/billing",
      linkLabel: "View details",
    },
  ];

  return (
    <div aria-labelledby="sa-dashboard-heading">
      {/* Page header */}
      <div className="mb-8">
        <h1
          id="sa-dashboard-heading"
          className="text-xl font-semibold tracking-tight text-foreground"
        >
          Platform Overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Holistic view of all tenants, subscriptions, and platform health.
        </p>
      </div>

      {/* ── KPI cards ── */}
      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        aria-label="Key platform metrics"
      >
        {kpis.map(({ title, value, sub, change, positive, negative, icon: Icon, to, linkLabel }) => (
          <Card key={title} className="relative">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {title}
              </CardTitle>
              <div className="rounded-md bg-primary/10 p-2" aria-hidden>
                <Icon className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p
                  className="text-2xl font-semibold tabular-nums tracking-tight text-foreground"
                  aria-label={`${title}: ${value}`}
                >
                  {value}
                </p>
                {change && (
                  <span
                    className={
                      positive
                        ? "text-xs font-medium text-emerald-600 dark:text-emerald-400"
                        : "text-xs font-medium text-destructive"
                    }
                  >
                    {change}
                  </span>
                )}
              </div>
              {sub && (
                <p className={`mt-0.5 text-xs ${negative ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                  {sub}
                </p>
              )}
              <Link
                to={to}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              >
                {linkLabel}
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* ── Charts ── */}
      <section className="mt-8 grid gap-4 lg:grid-cols-2" aria-label="Platform charts">
        {/* Revenue trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Activity className="h-4 w-4 text-muted-foreground" aria-hidden />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full" role="img" aria-label="Revenue over last 12 months">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatINR(value), "MRR"]} labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 500 }} />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#revenueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tenant growth */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden />
              Tenant Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full" role="img" aria-label="Tenant growth over time">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growth} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [value, "Tenants"]} labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 500 }} />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 0, r: 3 }} activeDot={{ r: 4, fill: "hsl(var(--chart-2))" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Plan distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
              <div className="h-52 w-52 shrink-0" role="img" aria-label="Subscription plan breakdown">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={plans}
                      dataKey="count"
                      nameKey="plan"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={76}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
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
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      aria-hidden
                    />
                    <span className="text-foreground font-medium">{p.plan}</span>
                    <span className="text-muted-foreground tabular-nums">{p.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Top tenants by members */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Tenants by Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52 w-full" role="img" aria-label="Top tenants ranked by member count">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topTenants}
                  layout="vertical"
                  margin={{ top: 0, right: 4, left: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                  <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [value.toLocaleString("en-IN"), "Members"]} labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 500 }} />
                  <Bar dataKey="members" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
