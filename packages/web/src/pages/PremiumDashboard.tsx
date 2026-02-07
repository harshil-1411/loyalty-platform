import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
  PieChart as PieChartIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import "./PremiumDashboard.css";

type DetailedViewWidget = "points" | "programs" | "transactions" | "rewards" | null;

export function PremiumDashboard() {
  const { state } = useAuth();
  const location = useLocation();
  const [detailedView, setDetailedView] = useState<DetailedViewWidget>(null);

  const tenantId = state.status === "authenticated" ? state.user.sub : "";
  const { data, loading, error } = useDashboardMetrics(tenantId);

  if (state.status !== "authenticated") return null;

  if (loading) {
    return (
      <div className="premium-dashboard" role="status" aria-live="polite" aria-busy="true">
        <Skeleton className="mb-6 h-9 w-56" />
        <div className="premium-dashboard-metrics">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="mb-3 mt-8 h-6 w-40" />
        <div className="premium-dashboard-charts-grid">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="premium-dashboard premium-dashboard-error">
        <p role="alert" className="text-destructive">
          {error}
        </p>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, charts } = data;

  const quickLinks = [
    { to: "/programs", label: "Programs" },
    { to: "/transactions", label: "Transactions" },
    { to: "/rewards", label: "Rewards" },
    { to: "/billing", label: "Billing" },
  ];

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "var(--radius)",
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
  };

  return (
    <div className="premium-dashboard" aria-labelledby="premium-dashboard-heading">
      <h2
        id="premium-dashboard-heading"
        className="text-2xl font-semibold tracking-tight text-foreground"
      >
        Dashboard
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Overview of your loyalty programs and activity
      </p>

      <nav className="premium-dashboard-quicklinks" aria-label="Quick links">
        {quickLinks.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "premium-dashboard-link rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              location.pathname === to
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-foreground hover:bg-muted"
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      <section aria-label="Key metrics" className="premium-dashboard-metrics">
        {[
          {
            key: "points" as const,
            title: "Total Points",
            value: metrics.totalPoints.toLocaleString(),
            icon: Coins,
            accent: "chart-1",
          },
          {
            key: "programs" as const,
            title: "Active Programs",
            value: String(metrics.activePrograms),
            icon: LayoutGrid,
            accent: "chart-2",
          },
          {
            key: "transactions" as const,
            title: "Transactions",
            value: metrics.transactionsCount.toLocaleString(),
            icon: Receipt,
            accent: "chart-3",
          },
          {
            key: "rewards" as const,
            title: "Rewards Redeemed",
            value: String(metrics.rewardsRedeemed),
            icon: Gift,
            accent: "chart-4",
          },
        ].map(({ key, title, value, icon: Icon, accent }) => (
          <Card
            key={key}
            className={cn(
              "premium-dashboard-widget overflow-hidden transition-shadow hover:shadow-md",
              "border-l-4 border-l-primary"
            )}
            role="button"
            tabIndex={0}
            onClick={() => setDetailedView((v) => (v === key ? null : key))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setDetailedView((v) => (v === key ? null : key));
              }
            }}
            aria-label={`${title}: ${value}. Click for details.`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
              <span className="rounded-md bg-muted/80 p-2" aria-hidden>
                <Icon className="h-5 w-5 text-foreground" />
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section
        className="premium-dashboard-charts"
        aria-labelledby="visual-breakdown-heading"
      >
        <h3
          id="visual-breakdown-heading"
          className="mb-4 text-lg font-semibold text-foreground"
        >
          Visual breakdown
        </h3>
        <div className="premium-dashboard-charts-grid">
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <PieChartIcon className="h-5 w-5 text-muted-foreground" aria-hidden />
              <CardTitle className="text-base">Points by program</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="h-64 w-full"
                role="img"
                aria-label="Points by program"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={charts.pointsByProgram}
                    margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={{ stroke: "hsl(var(--border))" }}
                      tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [value.toLocaleString(), "Points"]}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
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

          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" aria-hidden />
              <CardTitle className="text-base">Transactions over time</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="h-64 w-full"
                role="img"
                aria-label="Transactions over time"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={charts.transactionsOverTime}
                    margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [value, "Transactions"]}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 0 }}
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

      {detailedView && (
        <section
          className="premium-dashboard-detailed-view"
          aria-labelledby="detailed-view-heading"
          role="dialog"
          aria-modal="true"
          aria-label="Detailed view"
        >
          <h3 id="detailed-view-heading" className="text-base font-semibold">
            Detailed view
          </h3>
          <p data-testid="detailed-view-widget" className="mt-2 text-muted-foreground">
            {detailedView === "points" &&
              `Total Points: ${metrics.totalPoints.toLocaleString()}`}
            {detailedView === "programs" &&
              `Active Programs: ${metrics.activePrograms}`}
            {detailedView === "transactions" &&
              `Transactions: ${metrics.transactionsCount.toLocaleString()}`}
            {detailedView === "rewards" &&
              `Rewards Redeemed: ${metrics.rewardsRedeemed}`}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => setDetailedView(null)}
            aria-label="Close detailed view"
          >
            Close
          </Button>
        </section>
      )}
    </div>
  );
}
