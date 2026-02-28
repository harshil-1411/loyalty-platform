import { cn } from "@/lib/utils";

/** Preset style maps for status/event badges */
const BILLING_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  trialing: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  past_due: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  cancelled: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  none: "bg-muted text-muted-foreground",
};

const BILLING_LABELS: Record<string, string> = {
  active: "Active",
  trialing: "Trialing",
  past_due: "Past Due",
  cancelled: "Cancelled",
  none: "No Plan",
};

const EVENT_STYLES: Record<string, string> = {
  created: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  renewed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  past_due: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  trial_started: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

const EVENT_LABELS: Record<string, string> = {
  created: "Created",
  renewed: "Renewed",
  cancelled: "Cancelled",
  past_due: "Past Due",
  trial_started: "Trial Started",
};

const USER_STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  unconfirmed: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  disabled: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  CONFIRMED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  UNCONFIRMED: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  FORCE_CHANGE_PASSWORD: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const USER_STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  unconfirmed: "Unconfirmed",
  disabled: "Disabled",
  CONFIRMED: "Confirmed",
  UNCONFIRMED: "Unconfirmed",
  FORCE_CHANGE_PASSWORD: "Pending",
};

export type StatusBadgeVariant = "billing" | "event" | "user";

const STYLE_MAP: Record<StatusBadgeVariant, Record<string, string>> = {
  billing: BILLING_STYLES,
  event: EVENT_STYLES,
  user: USER_STATUS_STYLES,
};

const LABEL_MAP: Record<StatusBadgeVariant, Record<string, string>> = {
  billing: BILLING_LABELS,
  event: EVENT_LABELS,
  user: USER_STATUS_LABELS,
};

export interface StatusBadgeProps {
  /** Which preset to use for colors/labels */
  variant: StatusBadgeVariant;
  /** Status key (e.g. 'active', 'created', 'confirmed') */
  status: string;
  /** Override label; default from preset */
  label?: string;
  className?: string;
}

/** Shared status/event badge with color mapping. */
export function StatusBadge({ variant, status, label, className }: StatusBadgeProps) {
  const styles = STYLE_MAP[variant];
  const labels = LABEL_MAP[variant];
  const displayLabel = label ?? labels[status] ?? status;
  const styleClass = styles[status] ?? "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-medium leading-tight",
        styleClass,
        className
      )}
      role="status"
    >
      {displayLabel}
    </span>
  );
}
