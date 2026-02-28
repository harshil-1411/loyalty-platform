import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { getIdToken } from "@/auth/cognito";
import { listPrograms } from "@/api/programs";
import { getDashboardData } from "@/api/dashboard";
import { t } from "@/i18n";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Gift, Receipt, Award } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export function Dashboard() {
  const { state } = useAuth();
  const [programCount, setProgramCount] = useState<number | null>(null);
  const [chartData, setChartData] = useState<{ name: string; value: number }[] | null>(null);
  const [loading, setLoading] = useState(true);

  const tenantId = state.status === "authenticated" ? state.user.custom_tenant_id || state.user.sub : "";
  const tenantContext = state.status === "authenticated"
    ? (state.user.email ?? state.user.username ?? "")
    : "";

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [programsRes, dashboardData] = await Promise.all([
        listPrograms(tenantId, await getIdToken()),
        getDashboardData(tenantId),
      ]);
      setProgramCount(programsRes.programs?.length ?? 0);
      setChartData(dashboardData.charts.pointsByProgram);
    } catch {
      setProgramCount(0);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) void fetchData();
  }, [tenantId, fetchData]);

  if (state.status !== "authenticated") return null;

  return (
    <section aria-labelledby="dashboard-heading" className="space-y-6">
      <h2
        id="dashboard-heading"
        className="text-2xl font-semibold tracking-tight text-foreground"
      >
        {t("dashboard.title")}
      </h2>
      <p className="text-sm text-muted-foreground">
        <strong>{t("dashboard.tenantContext")}:</strong> {tenantContext}
      </p>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Programs</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{programCount ?? 0}</p>
                <Button variant="link" className="h-auto p-0 text-primary" asChild>
                  <Link to="/programs">Manage programs →</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">—</p>
                <Button variant="link" className="h-auto p-0 text-primary" asChild>
                  <Link to="/transactions">Earn & burn →</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rewards</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">—</p>
                <Button variant="link" className="h-auto p-0 text-primary" asChild>
                  <Link to="/rewards">Catalog & redeem →</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {chartData && chartData.length > 0 && (
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Points by program (sample)</CardTitle>
                <CardDescription>
                  Sample KPI — real data when analytics API is available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </section>
  );
}
