import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listPricingPlans,
  getPlanDistribution,
  type PricingPlan,
  type PlanDistribution,
} from "@/api/superadmin";
import { cn } from "@/lib/utils";

export function PricingPlans() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [distribution, setDistribution] = useState<PlanDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [p, d] = await Promise.all([listPricingPlans(), getPlanDistribution()]);
      if (!cancelled) {
        setPlans(p);
        setDistribution(d);
        setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div role="status" aria-live="polite" aria-busy="true">
        <p className="sr-only">Loading pricing plans…</p>
        <Skeleton className="mb-1 h-8 w-48" />
        <Skeleton className="mb-8 h-4 w-80" />
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-80 rounded-lg" />)}
        </div>
      </div>
    );
  }

  /* Build a map for quick lookup: plan name → tenant count */
  const distMap = new Map(distribution.map((d) => [d.plan, d.count]));

  /* Feature comparison rows */
  const featureRows = [
    { label: "Loyalty Programs", starter: "1", growth: "Up to 10", scale: "Unlimited" },
    { label: "Active Members", starter: "1,000", growth: "10,000", scale: "Unlimited" },
    { label: "Basic Reporting", starter: true, growth: true, scale: true },
    { label: "Advanced Reporting", starter: false, growth: true, scale: true },
    { label: "API Access", starter: false, growth: true, scale: true },
    { label: "Priority Support", starter: false, growth: true, scale: true },
    { label: "Dedicated Account Mgr", starter: false, growth: false, scale: true },
    { label: "Custom SLA", starter: false, growth: false, scale: true },
    { label: "SSO & RBAC", starter: false, growth: false, scale: true },
    { label: "White-Label Option", starter: false, growth: false, scale: true },
  ];

  return (
    <div aria-labelledby="plans-heading">
      {/* Header */}
      <div className="mb-8">
        <h1 id="plans-heading" className="text-xl font-semibold tracking-tight text-foreground">
          Pricing Plans
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform pricing tiers and current tenant distribution.
        </p>
      </div>

      {/* ── Plan cards ── */}
      <section className="mb-10 grid gap-6 md:grid-cols-3" aria-label="Available plans">
        {plans.map((plan) => {
          const tenantCount = distMap.get(plan.name) ?? distMap.get(plan.key.charAt(0).toUpperCase() + plan.key.slice(1)) ?? 0;
          const isPopular = plan.key === "growth";
          return (
            <Card
              key={plan.key}
              className={cn(
                "relative flex flex-col",
                isPopular && "border-primary/40 shadow-md"
              )}
            >
              {isPopular && (
                <span className="absolute -top-3 left-4 rounded-full bg-primary px-3 py-0.5 text-[0.6875rem] font-semibold text-primary-foreground">
                  Most Popular
                </span>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground">{plan.name}</CardTitle>
                <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{plan.priceRange}</p>
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  {tenantCount} {tenantCount === 1 ? "tenant" : "tenants"} on this plan
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Limits</div>
                <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Programs</span>
                    <p className="font-medium text-foreground">{plan.limits.programs}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Members</span>
                    <p className="font-medium text-foreground">{typeof plan.limits.members === "number" ? plan.limits.members.toLocaleString("en-IN") : plan.limits.members}</p>
                  </div>
                </div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Features</div>
                <ul className="flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* ── Feature comparison table ── */}
      <section aria-labelledby="comparison-heading">
        <h2 id="comparison-heading" className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Feature Comparison
        </h2>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[540px] text-sm" role="table">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Feature</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Starter</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Growth</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Scale</th>
                </tr>
              </thead>
              <tbody>
                {featureRows.map((row, idx) => (
                  <tr
                    key={row.label}
                    className={cn(
                      "border-b border-border last:border-0",
                      idx % 2 === 0 && "bg-muted/30"
                    )}
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">{row.label}</td>
                    {(["starter", "growth", "scale"] as const).map((tier) => {
                      const val = row[tier];
                      return (
                        <td key={tier} className="px-4 py-2.5 text-center">
                          {typeof val === "boolean" ? (
                            val ? (
                              <Check className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-label="Included" />
                            ) : (
                              <span className="text-muted-foreground/40" aria-label="Not included">—</span>
                            )
                          ) : (
                            <span className="tabular-nums text-foreground">{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
