import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  /** Optional icon in header */
  icon?: LucideIcon;
  /** Optional subtitle below value */
  sub?: React.ReactNode;
  /** Optional change text (e.g. "+5%") */
  change?: string;
  /** Whether change is positive (green) or negative (red); when negative, sub can be styled as warning */
  positive?: boolean;
  negative?: boolean;
  /** Link destination */
  to?: string;
  /** Link label for a11y */
  linkLabel?: string;
  /** Amber/warning style for icon and accent */
  warn?: boolean;
  className?: string;
}

/** Reusable KPI card for dashboard, billing, tenant detail. */
export function MetricCard({
  title,
  value,
  icon: Icon,
  sub,
  change,
  positive,
  negative,
  to,
  linkLabel,
  warn,
  className,
}: MetricCardProps) {
  const content = (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div
            className={cn(
              "rounded-md p-2",
              warn ? "bg-amber-100 dark:bg-amber-900/30" : "bg-primary/10"
            )}
            aria-hidden
          >
            <Icon
              className={cn(
                "h-4 w-4",
                warn ? "text-amber-600 dark:text-amber-400" : "text-primary"
              )}
            />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {value}
        </p>
        {change && (
          <span
            className={cn(
              "text-xs font-medium",
              positive && "text-emerald-600 dark:text-emerald-400",
              negative && "text-red-600 dark:text-red-400",
              !positive && !negative && "text-muted-foreground"
            )}
          >
            {change}
          </span>
        )}
        {sub && (
          <p
            className={cn(
              "mt-0.5 text-xs",
              negative ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
            )}
          >
            {sub}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (to && linkLabel) {
    return (
      <Link to={to} className="block transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg" aria-label={linkLabel}>
        {content}
      </Link>
    );
  }

  return content;
}
