import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FilterSelectConfig {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  "aria-label": string;
  placeholder?: string;
  triggerClassName?: string;
}

export interface FilterBarProps {
  /** Search input value */
  searchValue: string;
  /** Search input onChange */
  onSearchChange: (value: string) => void;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Search aria-label */
  searchAriaLabel?: string;
  /** Optional select filters (plan, status, tenant, role, etc.) */
  selects?: FilterSelectConfig[];
  /** Whether any filter is active (shows Clear button) */
  hasFilters: boolean;
  /** Clear all filters */
  onClear: () => void;
  className?: string;
}

/** Reusable filter row: search + optional selects + clear. */
export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  searchAriaLabel = "Search",
  selects = [],
  hasFilters,
  onClear,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", className)}
      role="search"
    >
      <div className="relative flex-1 max-w-sm">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
          aria-label={searchAriaLabel}
        />
      </div>
      {selects.map((sel) => (
        <Select key={sel["aria-label"]} value={sel.value} onValueChange={sel.onValueChange}>
          <SelectTrigger
            className={cn("w-[140px]", sel.triggerClassName)}
            aria-label={sel["aria-label"]}
          >
            <SelectValue placeholder={sel.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {sel.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="gap-1.5 text-muted-foreground"
          aria-label="Clear filters"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
