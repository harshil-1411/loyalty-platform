import { useCallback, useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp, RefreshCw, Users, Zap } from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { getIdToken } from "@/auth/cognito";
import type { Program } from "@/api/programs";
import { listPrograms } from "@/api/programs";
import { getBalance, earn, burn, listTransactions, type TransactionItem } from "@/api/transactions";
import { listRewards, type Reward } from "@/api/rewards";
import { MetricCard } from "@/components/ui/metric-card";
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
import { cn } from "@/lib/utils";

const TYPE_BADGE: Record<string, string> = {
  earn: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  burn: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  redemption: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        TYPE_BADGE[type] ?? "bg-muted text-muted-foreground"
      )}
    >
      {type}
    </span>
  );
}

function formatDate(iso: string | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
}

export function Transactions() {
  const { state } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [typeFilter, setTypeFilter] = useState<"" | "earn" | "burn" | "redemption">("");
  const [period, setPeriod] = useState<"all" | "today" | "7d" | "30d" | "month">("all");
  const [showRecord, setShowRecord] = useState(false);
  const [earnPoints, setEarnPoints] = useState(10);
  const [burnPoints, setBurnPoints] = useState(5);
  const [recordMember, setRecordMember] = useState("");
  const [error, setError] = useState("");
  // undefined = token not yet fetched
  const [idToken, setIdToken] = useState<string | null | undefined>(undefined);

  const tenantId = state.status === "authenticated" ? state.user.custom_tenant_id || state.user.sub : "";

  // ── computed stats from all loaded transactions ────────────────────────────
  const totalIssued = transactions.reduce((s, t) => t.type === "earn" ? s + t.points : s, 0);
  const totalRedeemed = transactions.reduce((s, t) => t.type === "redemption" ? s + t.points : s, 0);
  const totalBurned = transactions.reduce((s, t) => t.type === "burn" ? s + t.points : s, 0);
  const redemptionRate = totalIssued > 0 ? Math.round(((totalRedeemed + totalBurned) / totalIssued) * 100) : 0;
  const activeMembers = new Set(transactions.map((t) => t.memberId)).size;

  // ── reward name lookup map ─────────────────────────────────────────────────
  const rewardMap = Object.fromEntries(rewards.map((r) => [r.rewardId, r.name]));

  // ── period boundary ────────────────────────────────────────────────────────
  function periodStart(): string | null {
    const now = new Date();
    if (period === "today") { const d = new Date(now); d.setHours(0,0,0,0); return d.toISOString(); }
    if (period === "7d") return new Date(now.getTime() - 7*24*60*60*1000).toISOString();
    if (period === "30d") return new Date(now.getTime() - 30*24*60*60*1000).toISOString();
    if (period === "month") { const d = new Date(now.getFullYear(), now.getMonth(), 1); return d.toISOString(); }
    return null;
  }

  // ── client-side filter ─────────────────────────────────────────────────────
  const pStart = periodStart();
  const filteredTransactions = transactions.filter((tx) => {
    if (memberFilter.trim() && tx.memberId !== memberFilter.trim()) return false;
    if (typeFilter && tx.type !== typeFilter) return false;
    if (pStart && tx.createdAt && tx.createdAt < pStart) return false;
    return true;
  });

  const fetchToken = useCallback(async () => {
    const t = await getIdToken();
    setIdToken(t);
  }, []);

  const fetchPrograms = useCallback(async () => {
    if (!tenantId) return;
    setLoadingPrograms(true);
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

  const fetchTransactions = useCallback(async (append = false) => {
    if (!tenantId || !programId) return;
    setLoadingTransactions(true);
    setError("");
    try {
      const res = await listTransactions(
        tenantId,
        programId,
        { limit: 100, nextToken: append ? nextToken ?? undefined : undefined },
        idToken ?? undefined
      );
      setTransactions((prev) => append ? [...prev, ...(res.transactions ?? [])] : (res.transactions ?? []));
      setNextToken(res.nextToken ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions");
      if (!append) setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  }, [tenantId, programId, nextToken, idToken]);

  const fetchRewards = useCallback(async () => {
    if (!tenantId || !programId) return;
    try {
      const res = await listRewards(tenantId, programId, idToken ?? undefined);
      setRewards(res.rewards ?? []);
    } catch { /* non-critical */ }
  }, [tenantId, programId, idToken]);

  const fetchBalance = useCallback(async () => {
    if (!tenantId || !programId || !memberFilter.trim()) { setBalance(null); return; }
    setLoadingBalance(true);
    try {
      const res = await getBalance(tenantId, programId, memberFilter.trim(), idToken ?? undefined);
      setBalance(res.balance);
    } catch { setBalance(null); }
    finally { setLoadingBalance(false); }
  }, [tenantId, programId, memberFilter, idToken]);

  useEffect(() => { fetchToken(); }, [fetchToken]);
  useEffect(() => { if (tenantId && idToken !== undefined) fetchPrograms(); }, [tenantId, idToken, fetchPrograms]);
  useEffect(() => {
    if (programId) {
      void fetchTransactions(false);
      void fetchRewards();
    } else {
      setTransactions([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, idToken]);
  useEffect(() => { void fetchBalance(); }, [fetchBalance]);

  async function handleEarn(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !programId || !recordMember.trim() || earnPoints <= 0) return;
    try {
      const res = await earn(tenantId, programId, { memberId: recordMember.trim(), points: earnPoints }, idToken ?? undefined);
      setBalance(res.balance);
      void fetchTransactions(false);
      toast.success(`+${earnPoints} pts earned for ${recordMember}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Earn failed");
    }
  }

  async function handleBurn(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !programId || !recordMember.trim() || burnPoints <= 0) return;
    try {
      const res = await burn(tenantId, programId, { memberId: recordMember.trim(), points: burnPoints }, idToken ?? undefined);
      setBalance(res.balance);
      void fetchTransactions(false);
      toast.success(`-${burnPoints} pts burned for ${recordMember}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Burn failed");
    }
  }

  if (state.status !== "authenticated") return null;

  const selectedProgram = programs.find((p) => p.programId === programId);

  return (
    <div className="space-y-6">
      {/* ── header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Transactions</h2>
        {programId && (
          <Button
            variant={showRecord ? "secondary" : "outline"}
            onClick={() => setShowRecord((s) => !s)}
          >
            {showRecord ? <ChevronUp className="mr-1.5 h-4 w-4" /> : <ChevronDown className="mr-1.5 h-4 w-4" />}
            Record Transaction
          </Button>
        )}
      </div>

      {/* ── program selector ── */}
      {loadingPrograms ? (
        <Skeleton className="h-9 w-64" />
      ) : programs.length === 0 ? (
        <p className="text-muted-foreground">Create a program first on the Programs page.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1.5">
              <Label>Program</Label>
              <Select value={programId} onValueChange={(v) => { setProgramId(v); setTransactions([]); setNextToken(null); }}>
                <SelectTrigger className="min-w-[220px]">
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.programId} value={p.programId}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          {/* ── stat strip ── */}
          {programId && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard
                title="Points Issued"
                value={loadingTransactions ? "—" : totalIssued.toLocaleString("en-IN")}
                icon={ArrowUpRight}
                sub="from earn transactions"
                positive={totalIssued > 0}
              />
              <MetricCard
                title="Points Redeemed"
                value={loadingTransactions ? "—" : totalRedeemed.toLocaleString("en-IN")}
                icon={ArrowDownLeft}
                sub="rewards redeemed"
              />
              <MetricCard
                title="Redemption Rate"
                value={loadingTransactions ? "—" : `${redemptionRate}%`}
                icon={RefreshCw}
                sub="of issued pts used"
                positive={redemptionRate >= 50}
                warn={redemptionRate > 0 && redemptionRate < 20}
              />
              <MetricCard
                title="Active Members"
                value={loadingTransactions ? "—" : activeMembers}
                icon={Users}
                sub="unique in ledger"
              />
            </div>
          )}

          {/* ── record transaction panel ── */}
          {showRecord && programId && (
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Record Transaction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="record-member">Member ID</Label>
                  <Input
                    id="record-member"
                    value={recordMember}
                    onChange={(e) => setRecordMember(e.target.value)}
                    placeholder="e.g. member_priya_001"
                    className="max-w-xs"
                  />
                  {recordMember.trim() && (
                    <p className="text-xs text-muted-foreground">
                      {loadingBalance ? "Loading balance…" : balance !== null ? `Balance: ${balance.toLocaleString("en-IN")} pts` : ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-4">
                  {/* Earn */}
                  <form onSubmit={handleEarn} className="flex items-end gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="earn-pts">Earn points</Label>
                      <Input id="earn-pts" type="number" min={1} value={earnPoints} onChange={(e) => setEarnPoints(Number(e.target.value))} className="w-28" />
                    </div>
                    <Button type="submit" disabled={!recordMember.trim()} className="bg-emerald-600 hover:bg-emerald-700">Earn</Button>
                  </form>
                  {/* Burn */}
                  <form onSubmit={handleBurn} className="flex items-end gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="burn-pts">Burn points</Label>
                      <Input id="burn-pts" type="number" min={1} value={burnPoints} onChange={(e) => setBurnPoints(Number(e.target.value))} className="w-28" />
                    </div>
                    <Button type="submit" variant="outline" disabled={!recordMember.trim()}>Burn</Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── transaction table ── */}
          {programId && (
            <Card className="border-border shadow-sm">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base">Transaction Ledger</CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Member filter */}
                    <Input
                      type="text"
                      value={memberFilter}
                      onChange={(e) => setMemberFilter(e.target.value)}
                      placeholder="Filter by member ID"
                      className="h-8 w-[180px] text-sm"
                      aria-label="Filter by member ID"
                    />
                    {/* Type filter */}
                    <Select
                      value={typeFilter || "all"}
                      onValueChange={(v) => setTypeFilter(v === "all" ? "" : (v as "earn" | "burn" | "redemption"))}
                    >
                      <SelectTrigger className="h-8 w-[130px] text-sm">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="earn">Earn</SelectItem>
                        <SelectItem value="burn">Burn</SelectItem>
                        <SelectItem value="redemption">Redemption</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Period filter */}
                    <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
                      <SelectTrigger className="h-8 w-[120px] text-sm">
                        <SelectValue placeholder="All time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="month">This month</SelectItem>
                      </SelectContent>
                    </Select>
                    {(memberFilter || typeFilter || period !== "all") && (
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => { setMemberFilter(""); setTypeFilter(""); setPeriod("all"); }}>
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
                {memberFilter.trim() && balance !== null && (
                  <p className="text-sm text-muted-foreground">
                    Current balance for <strong>{memberFilter.trim()}</strong>:{" "}
                    <span className="font-semibold text-foreground">{balance.toLocaleString("en-IN")} pts</span>
                    {selectedProgram?.currency ? ` (${selectedProgram.currency})` : ""}
                  </p>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm" role="grid" aria-label="Transaction ledger">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground" scope="col">Date</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground" scope="col">Member</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground" scope="col">Type</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground" scope="col">Reward</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted-foreground" scope="col">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingTransactions && transactions.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
                      ) : filteredTransactions.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          {transactions.length === 0 ? "No transactions yet" : "No transactions match the filter"}
                        </td></tr>
                      ) : (
                        filteredTransactions.map((tx) => (
                          <tr key={tx.transactionId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{formatDate(tx.createdAt)}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-foreground">{tx.memberId}</td>
                            <td className="px-4 py-2.5"><TypeBadge type={tx.type} /></td>
                            <td className="px-4 py-2.5 text-sm text-muted-foreground">
                              {tx.type === "redemption" && tx.rewardId ? (rewardMap[tx.rewardId] ?? tx.rewardId) : "—"}
                            </td>
                            <td className={cn(
                              "px-4 py-2.5 text-right font-semibold tabular-nums",
                              tx.type === "earn" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                            )}>
                              {tx.type === "earn" ? "+" : "−"}{tx.points.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Mobile cards */}
                <div className="space-y-2 p-4 md:hidden">
                  {loadingTransactions && transactions.length === 0 ? (
                    [1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)
                  ) : filteredTransactions.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">No transactions</p>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <div key={tx.transactionId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs text-foreground">{tx.memberId}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TypeBadge type={tx.type} />
                          <span className={cn(
                            "font-semibold tabular-nums",
                            tx.type === "earn" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                          )}>
                            {tx.type === "earn" ? "+" : "−"}{tx.points.toLocaleString("en-IN")} pts
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {nextToken && (
                  <div className="border-t border-border p-3">
                    <Button variant="outline" size="sm" disabled={loadingTransactions} onClick={() => void fetchTransactions(true)}>
                      {loadingTransactions ? "Loading…" : "Load more"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
