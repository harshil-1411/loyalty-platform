import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import { getIdToken } from "@/auth/cognito";
import type { Program } from "@/api/programs";
import { listPrograms } from "@/api/programs";
import { getBalance, earn, burn, listTransactions, type TransactionItem } from "@/api/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export function Transactions() {
  const { state } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"" | "earn" | "burn" | "redemption">("");
  const [error, setError] = useState("");
  const [idToken, setIdToken] = useState<string | null>(null);

  /** Client-side filter by transaction type (earn, burn, redemption). */
  const filteredTransactions = typeFilter
    ? transactions.filter((tx) => tx.type === typeFilter)
    : transactions;

  const tenantId = state.status === "authenticated" ? state.user.sub : "";

  const fetchToken = useCallback(async () => {
    const t = await getIdToken();
    setIdToken(t);
  }, []);

  const fetchPrograms = useCallback(async () => {
    if (!tenantId) return;
    setLoadingPrograms(true);
    setError("");
    try {
      const res = await listPrograms(tenantId, idToken ?? undefined);
      setPrograms(res.programs ?? []);
      if (res.programs?.length && !programId) setProgramId(res.programs[0].programId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load programs");
    } finally {
      setLoadingPrograms(false);
    }
  }, [tenantId, programId, idToken]);

  const fetchBalance = useCallback(async () => {
    if (!tenantId || !programId || !memberId.trim()) {
      setBalance(null);
      return;
    }
    setLoadingBalance(true);
    setError("");
    try {
      const res = await getBalance(
        tenantId,
        programId,
        memberId.trim(),
        idToken ?? undefined
      );
      setBalance(res.balance);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load balance");
      setBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  }, [tenantId, programId, memberId, idToken]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  useEffect(() => {
    if (tenantId) fetchPrograms();
  }, [tenantId, idToken, fetchPrograms]);

  useEffect(() => {
    if (programId && memberId.trim()) void fetchBalance();
    else setBalance(null);
  }, [programId, memberId, fetchBalance]);

  const fetchTransactions = useCallback(async (append = false) => {
    if (!tenantId || !programId) return;
    setLoadingTransactions(true);
    setError("");
    try {
      const res = await listTransactions(
        tenantId,
        programId,
        {
          memberId: memberId.trim() || undefined,
          limit: 50,
          nextToken: append ? nextToken ?? undefined : undefined,
        },
        idToken ?? undefined
      );
      setTransactions((prev) => (append ? [...prev, ...(res.transactions ?? [])] : res.transactions ?? []));
      setNextToken(res.nextToken ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions");
      if (!append) setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  }, [tenantId, programId, memberId, nextToken, idToken]);

  useEffect(() => {
    if (!programId || !memberId.trim()) {
      setTransactions([]);
      setNextToken(null);
      return;
    }
    let cancelled = false;
    setLoadingTransactions(true);
    setError("");
    listTransactions(
      tenantId,
      programId,
      { memberId: memberId.trim(), limit: 50 },
      idToken ?? undefined
    )
      .then((res) => {
        if (!cancelled) {
          setTransactions(res.transactions ?? []);
          setNextToken(res.nextToken ?? null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load transactions");
          setTransactions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTransactions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [programId, memberId, tenantId, idToken]);

  async function handleEarn(e: React.FormEvent, points: number) {
    e.preventDefault();
    if (!tenantId || !programId || !memberId.trim() || points <= 0) return;
    setError("");
    try {
      const res = await earn(
        tenantId,
        programId,
        { memberId: memberId.trim(), points },
        idToken ?? undefined
      );
      setBalance(res.balance);
      void fetchTransactions(false);
      toast.success("Points earned");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Earn failed");
      toast.error(err instanceof Error ? err.message : "Earn failed");
    }
  }

  async function handleBurn(e: React.FormEvent, points: number) {
    e.preventDefault();
    if (!tenantId || !programId || !memberId.trim() || points <= 0) return;
    setError("");
    try {
      const res = await burn(
        tenantId,
        programId,
        { memberId: memberId.trim(), points },
        idToken ?? undefined
      );
      setBalance(res.balance);
      void fetchTransactions(false);
      toast.success("Points burned");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Burn failed");
      toast.error(err instanceof Error ? err.message : "Burn failed");
    }
  }

  if (state.status !== "authenticated") return null;

  const selectedProgram = programs.find((p) => p.programId === programId);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        Balance &amp; transactions
      </h2>
      <p className="text-sm text-muted-foreground">
        View balance and earn or burn points for a member in a program.
      </p>

      {loadingPrograms ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-64" />
        </div>
      ) : programs.length === 0 ? (
        <p className="text-muted-foreground">Create a program first (Programs page).</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-6">
            <div className="space-y-2">
              <Label>Program</Label>
              <Select value={programId} onValueChange={setProgramId}>
                <SelectTrigger className="min-w-[200px]">
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.programId} value={p.programId}>
                      {p.name} ({p.programId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Member ID</Label>
              <Input
                type="text"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="e.g. member_123 or user sub"
                className="min-w-[200px]"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {memberId.trim() && (
            <>
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingBalance ? (
                    <Skeleton className="h-8 w-32" />
                  ) : balance !== null ? (
                    <p className="text-2xl font-semibold text-foreground">
                      {balance} points
                      {selectedProgram?.currency ? ` (${selectedProgram.currency})` : ""}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-6">
                <Card className="min-w-[200px] border-border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Earn points</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const pts = Number(
                          (e.currentTarget.elements.namedItem("earnPoints") as HTMLInputElement)
                            .value
                        );
                        if (!Number.isNaN(pts) && pts > 0) void handleEarn(e, pts);
                      }}
                      className="space-y-3"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="earn-points">Points</Label>
                        <Input
                          id="earn-points"
                          type="number"
                          name="earnPoints"
                          min={1}
                          defaultValue={10}
                        />
                      </div>
                      <Button type="submit">Earn</Button>
                    </form>
                  </CardContent>
                </Card>
                <Card className="min-w-[200px] border-border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Burn points</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const pts = Number(
                          (e.currentTarget.elements.namedItem("burnPoints") as HTMLInputElement)
                            .value
                        );
                        if (!Number.isNaN(pts) && pts > 0) void handleBurn(e, pts);
                      }}
                      className="space-y-3"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="burn-points">Points</Label>
                        <Input
                          id="burn-points"
                          type="number"
                          name="burnPoints"
                          min={1}
                          defaultValue={5}
                        />
                      </div>
                      <Button type="submit" variant="outline">
                        Burn
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border shadow-sm">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base">Transaction history</CardTitle>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="tx-type-filter" className="sr-only">
                      Filter by type
                    </Label>
                    <Select
                      value={typeFilter || "all"}
                      onValueChange={(v) => setTypeFilter(v === "all" ? "" : (v as "earn" | "burn" | "redemption"))}
                      aria-label="Filter transactions by type"
                    >
                      <SelectTrigger id="tx-type-filter" className="w-[140px]">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="earn">Earn</SelectItem>
                        <SelectItem value="burn">Burn</SelectItem>
                        <SelectItem value="redemption">Redemption</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Desktop: table */}
                  <div className="hidden overflow-hidden rounded-md border border-border md:block">
                    <table className="w-full text-sm" role="grid" aria-label="Transaction history">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-4 py-2 text-left font-medium" scope="col">Date</th>
                          <th className="px-4 py-2 text-left font-medium" scope="col">Type</th>
                          <th className="px-4 py-2 text-right font-medium" scope="col">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingTransactions && transactions.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                              Loading…
                            </td>
                          </tr>
                        ) : filteredTransactions.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                              {transactions.length === 0
                                ? "No transactions yet"
                                : `No ${typeFilter || "matching"} transactions`}
                            </td>
                          </tr>
                        ) : (
                          filteredTransactions.map((tx) => (
                            <tr key={tx.transactionId} className="border-b border-border last:border-0">
                              <td className="px-4 py-2 text-muted-foreground">
                                {tx.createdAt ? new Date(tx.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—"}
                              </td>
                              <td className="px-4 py-2 capitalize">{tx.type}</td>
                              <td className="px-4 py-2 text-right font-medium">
                                {tx.type === "burn" || tx.type === "redemption" ? "-" : "+"}
                                {tx.points}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile: stacked cards (no horizontal scroll) */}
                  <div className="space-y-2 md:hidden" role="list" aria-label="Transaction history">
                    {loadingTransactions && transactions.length === 0 ? (
                      <div className="rounded-md border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                        Loading…
                      </div>
                    ) : filteredTransactions.length === 0 ? (
                      <div className="rounded-md border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                        {transactions.length === 0
                          ? "No transactions yet"
                          : `No ${typeFilter || "matching"} transactions`}
                      </div>
                    ) : (
                      filteredTransactions.map((tx) => (
                        <div
                          key={tx.transactionId}
                          role="listitem"
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm"
                        >
                          <span className="text-muted-foreground">
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—"}
                          </span>
                          <span className="capitalize font-medium">{tx.type}</span>
                          <span className="font-medium tabular-nums">
                            {tx.type === "burn" || tx.type === "redemption" ? "-" : "+"}
                            {tx.points} pts
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  {nextToken && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      disabled={loadingTransactions}
                      onClick={() => void fetchTransactions(true)}
                      aria-label="Load more transactions"
                    >
                      {loadingTransactions ? "Loading…" : "Load more"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
