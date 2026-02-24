import * as React from "react";
import { cn } from "@/lib/utils";

export interface DataTableColumn {
  /** Column content (e.g. "Tenant", "Plan") */
  header: React.ReactNode;
  /** Optional grid column class (e.g. "text-right") */
  className?: string;
}

export interface DataTableProps {
  /** Column definitions; grid layout should match row layout (e.g. md:grid-cols-[2fr_1fr_1fr]) */
  columns: DataTableColumn[];
  /** Header row grid class (e.g. "md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]") */
  headerGridClass?: string;
  /** Table content (rows). Each row should use the same grid class as header for alignment. */
  children: React.ReactNode;
  /** When no rows: show this instead of header + children */
  emptyState?: React.ReactNode;
  /** Whether there are zero rows (show emptyState) */
  isEmpty: boolean;
  className?: string;
}

/**
 * Generic responsive table: optional header, rows, and empty state.
 * Parent supplies row structure; this component handles header alignment and empty state.
 */
export function DataTable({
  columns,
  headerGridClass = "md:grid",
  children,
  emptyState,
  isEmpty,
  className,
}: DataTableProps) {
  if (isEmpty && emptyState) {
    return <div className={cn(className)}>{emptyState}</div>;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "hidden rounded-md border border-border bg-muted/50 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground",
          headerGridClass
        )}
        role="row"
      >
        {columns.map((col, i) => (
          <span key={i} className={col.className}>
            {col.header}
          </span>
        ))}
      </div>
      {children}
    </div>
  );
}
