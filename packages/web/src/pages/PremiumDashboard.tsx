import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Coins,
  LayoutGrid,
  Receipt,
  Gift,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";

export function PremiumDashboard() {
  const { state } = useAuth();
  const tenantId = state.status === "authenticated" ? state.user.custom_tenant_id || state.user.sub : "";
  const { data, loading, error, refetch } = useDashboardMetrics(tenantId);

  if (state.status !== "authenticated") return null;

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Loading dashboard"
      >
        <p className="sr-only">Loading dashboard…</p>
        <Skeleton className="mb-1 h-8 w-40" />
        <Skeleton className="mb-8 h-4 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[136px] rounded-lg" />
          ))}
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[320px] rounded-lg" />
          <Skeleton className="h-[320px] rounded-lg" />
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <div
          className="mt-6 rounded-lg border border-border bg-card p-6"
          role="alert"
          aria-live="assertive"
        >
          <p className="font-medium text-foreground">
            We couldn't load your dashboard.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => void refetch()}
            aria-label="Try again"
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, charts } = data;

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "var(--radius)",
    padding: "0.5rem 0.75rem",
    fontSize: "0.8125rem",
    boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
  };

  const metricCards = [
    {
      title: "Total points",
      value: metrics.totalPoints.toLocaleString(),
      icon: Coins,
      to: "/transactions",
      linkLabel: "View transactions",
      change: "+12%",
    },
    {
      title: "Active programs",
      value: String(metrics.activePrograms),
      icon: LayoutGrid,
      to: "/programs",
      linkLabel: "Manage programs",
    },
    {
      title: "Transactions",
      value: metrics.transactionsCount.toLocaleString(),
      icon: Receipt,
      to: "/transactions",
      linkLabel: "View history",
      change: "+8%",
    },
    {
      title: "Rewards redeemed",
      value: String(metrics.rewardsRedeemed),
      icon: Gift,
      to: "/rewards",
      linkLabel: "View rewards",
    },
  ];

  return (
    <div aria-labelledby="dashboard-heading">
      {/* Page header */}
      <div className="mb-8">
        <h1
          id="dashboard-heading"
          className="text-xl font-semibold tracking-tight text-foreground"
        >
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your loyalty programs at a glance.
        </p>
      </div>

      {/* ── Metric cards ── */}
      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Key metrics"
      >
        {metricCards.map(({ title, value, icon: Icon, to, linkLabel, change }) => (
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
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {change}
                  </span>
                )}
              </div>
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
      <section className="mt-8" aria-labelledby="charts-heading">
        <h2
          id="charts-heading"
          className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Breakdown
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden />
                Points by program
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="h-64 min-h-[200px] w-full"
                role="img"
                aria-label="Points by program"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={charts.pointsByProgram}
                    margin={{ top: 4, right: 4, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [value.toLocaleString(), "Points"]}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 500 }}
                    />
                    <Bar
                      dataKey="value"
                      fill="hsl(var(--chart-1))"
                      radius={[4, 4, 0, 0]}
                      name="Points"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden />
                Transactions this week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="h-64 min-h-[200px] w-full"
                role="img"
                aria-label="Transactions this week"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={charts.transactionsOverTime}
                    margin={{ top: 4, right: 4, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [value, "Transactions"]}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 500 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 4, fill: "hsl(var(--chart-2))" }}
                      name="Transactions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
