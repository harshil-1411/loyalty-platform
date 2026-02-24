import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PAGE_SIZE_DEFAULT = 20;

export interface PaginationProps {
  /** Total number of items */
  totalItems: number;
  /** Items per page */
  pageSize?: number;
  /** Current 1-based page */
  page: number;
  /** Called with 1-based page when user changes page */
  onPageChange: (page: number) => void;
  /** Optional class name for the container */
  className?: string;
  /** Accessible label for the nav (e.g. "Tenant list pagination") */
  "aria-label"?: string;
}

/**
 * Offset-based pagination: shows "Showing X–Y of Z" and Previous/Next.
 * Page size default 20. Use with sliced data in parent.
 */
export function Pagination({
  totalItems,
  pageSize = PAGE_SIZE_DEFAULT,
  page,
  onPageChange,
  className,
  "aria-label": ariaLabel = "Pagination",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const start = (safePage - 1) * pageSize;
  const end = Math.min(safePage * pageSize, totalItems);

  const goPrev = () => onPageChange(Math.max(1, safePage - 1));
  const goNext = () => onPageChange(Math.min(totalPages, safePage + 1));

  if (totalItems <= pageSize) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        Showing all {totalItems} {totalItems === 1 ? "item" : "items"}.
      </p>
    );
  }

  return (
    <nav
      className={cn("flex flex-wrap items-center justify-between gap-3", className)}
      aria-label={ariaLabel}
    >
      <p className="text-sm text-muted-foreground">
        Showing {start + 1}–{end} of {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={goPrev}
          disabled={safePage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground" aria-live="polite">
          Page {safePage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={goNext}
          disabled={safePage >= totalPages}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </nav>
  );
}

export { PAGE_SIZE_DEFAULT };
