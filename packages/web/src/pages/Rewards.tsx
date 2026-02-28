import { useCallback, useEffect, useRef, useState } from "react";
import {
  Gift, Plus, Star, Trophy, Search, SlidersHorizontal,
  Zap, ArrowUpDown, Flame, Crown, Sparkles,
} from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { getIdToken } from "@/auth/cognito";
import type { Program } from "@/api/programs";
import type { Reward } from "@/api/rewards";
import { listPrograms } from "@/api/programs";
import { listRewards, createReward, redeem } from "@/api/rewards";
import { listTransactions, type TransactionItem } from "@/api/transactions";
import { MetricCard } from "@/components/ui/metric-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── tier system ──────────────────────────────────────────────────────────────
type Tier = { label: string; gradient: string; iconBg: string; badge: string; icon: typeof Zap };

function getTier(pts: number): Tier {
  if (pts <= 75)  return { label: "Starter",  gradient: "from-emerald-400 via-teal-500 to-cyan-600",    iconBg: "bg-emerald-50 text-emerald-600",   badge: "bg-emerald-100 text-emerald-700 ring-emerald-200", icon: Zap };
  if (pts <= 300) return { label: "Popular",  gradient: "from-indigo-500 via-blue-500 to-sky-600",       iconBg: "bg-indigo-50 text-indigo-600",     badge: "bg-indigo-100 text-indigo-700 ring-indigo-200",   icon: Flame };
  if (pts <= 750) return { label: "Premium",  gradient: "from-violet-500 via-purple-500 to-fuchsia-600", iconBg: "bg-violet-50 text-violet-600",     badge: "bg-violet-100 text-violet-700 ring-violet-200",   icon: Sparkles };
  return           { label: "VIP",      gradient: "from-amber-400 via-orange-500 to-rose-500",     iconBg: "bg-amber-50 text-amber-600",       badge: "bg-amber-100 text-amber-700 ring-amber-200",      icon: Crown };
}

// ── quick-add templates ───────────────────────────────────────────────────────
const TEMPLATES = [
  { name: "Free Delivery",        pointsCost: 25  },
  { name: "₹50 Discount",        pointsCost: 100 },
  { name: "Birthday Surprise",   pointsCost: 200 },
  { name: "₹200 Voucher",        pointsCost: 400 },
  { name: "Premium Access",      pointsCost: 800 },
];

type SortKey = "popular" | "pts_asc" | "pts_desc" | "name";

// ── main page ─────────────────────────────────────────────────────────────────
export function Rewards() {
  const { state } = useAuth();
  const [programs, setPrograms]           = useState<Program[]>([]);
  const [programId, setProgramId]         = useState("");
  const [rewards, setRewards]             = useState<Reward[]>([]);
  const [transactions, setTransactions]   = useState<TransactionItem[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingRewards, setLoadingRewards]   = useState(false);
  const [error, setError]                 = useState("");
  const [idToken, setIdToken]             = useState<string | null | undefined>(undefined);
  const [search, setSearch]               = useState("");
  const [sort, setSort]                   = useState<SortKey>("popular");
  const addPanelRef = useRef<HTMLDivElement>(null);

  const tenantId = state.status === "authenticated"
    ? state.user.custom_tenant_id || state.user.sub : "";

  // ── derived stats ────────────────────────────────────────────────────────────
  const redemptionCounts = transactions.reduce<Record<string, number>>((acc, tx) => {
    if (tx.type === "redemption" && tx.rewardId) acc[tx.rewardId] = (acc[tx.rewardId] ?? 0) + 1;
    return acc;
  }, {});
  const totalRedemptions   = transactions.filter(t => t.type === "redemption").length;
  const maxRedemptions     = Math.max(1, ...Object.values(redemptionCounts));
  const mostPopularId      = Object.entries(redemptionCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const mostPopularReward  = rewards.find(r => r.rewardId === mostPopularId);

  // ── filtered + sorted rewards ────────────────────────────────────────────────
  const filteredRewards = rewards
    .filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "popular") return (redemptionCounts[b.rewardId] ?? 0) - (redemptionCounts[a.rewardId] ?? 0);
      if (sort === "pts_asc")  return a.pointsCost - b.pointsCost;
      if (sort === "pts_desc") return b.pointsCost - a.pointsCost;
      return a.name.localeCompare(b.name);
    });

  // ── data fetching ─────────────────────────────────────────────────────────────
  const fetchToken    = useCallback(async () => { const t = await getIdToken(); setIdToken(t); }, []);

  const fetchPrograms = useCallback(async () => {
    if (!tenantId) return;
    setLoadingPrograms(true);
    try {
      const res = await listPrograms(tenantId, idToken ?? undefined);
      setPrograms(res.programs ?? []);
      if (res.programs?.length && !programId) setProgramId(res.programs[0].programId);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load programs"); }
    finally { setLoadingPrograms(false); }
  }, [tenantId, programId, idToken]);

  const fetchRewards = useCallback(async () => {
    if (!tenantId || !programId) return;
    setLoadingRewards(true);
    try {
      const res = await listRewards(tenantId, programId, idToken ?? undefined);
      setRewards(res.rewards ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load rewards"); setRewards([]); }
    finally { setLoadingRewards(false); }
  }, [tenantId, programId, idToken]);

  const fetchTransactions = useCallback(async () => {
    if (!tenantId || !programId) return;
    try {
      const res = await listTransactions(tenantId, programId, { limit: 100 }, idToken ?? undefined);
      setTransactions(res.transactions ?? []);
    } catch { /* stats degrade gracefully */ }
  }, [tenantId, programId, idToken]);

  useEffect(() => { fetchToken(); }, [fetchToken]);
  useEffect(() => { if (tenantId && idToken !== undefined) void fetchPrograms(); }, [tenantId, idToken, fetchPrograms]);
  useEffect(() => {
    if (programId) { void fetchRewards(); void fetchTransactions(); }
    else { setRewards([]); setTransactions([]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, idToken]);

  if (state.status !== "authenticated") return null;

  const currentProgram = programs.find(p => p.programId === programId);

  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Rewards</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage your loyalty reward catalog and process redemptions
          </p>
        </div>

        {/* Mobile: scroll-to-add button */}
        {programId && (
          <Button
            size="sm"
            className="lg:hidden"
            onClick={() => addPanelRef.current?.scrollIntoView({ behavior: "smooth" })}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add Reward
          </Button>
        )}
      </div>

      {/* ── Program selector ──────────────────────────────────────────────────── */}
      {loadingPrograms ? (
        <Skeleton className="h-10 w-72" />
      ) : programs.length === 0 ? (
        <EmptyPrograms />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Select value={programId} onValueChange={v => { setProgramId(v); setSearch(""); }}>
            <SelectTrigger className="w-72 font-medium">
              <SelectValue placeholder="Select program" />
            </SelectTrigger>
            <SelectContent>
              {programs.map(p => (
                <SelectItem key={p.programId} value={p.programId}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentProgram && (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              {currentProgram.currency}
            </span>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      {/* ── Body (only when program selected) ───────────────────────────────── */}
      {programId && (
        <>
          {/* Stat strip */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricCard
              title="Rewards in Catalog"
              value={loadingRewards ? "—" : rewards.length}
              icon={Gift}
              sub="available to members"
            />
            <MetricCard
              title="Total Redemptions"
              value={totalRedemptions}
              icon={Trophy}
              sub="across all rewards"
              positive={totalRedemptions > 0}
            />
            <MetricCard
              title="Most Popular"
              value={mostPopularReward ? mostPopularReward.name : "—"}
              icon={Star}
              sub={mostPopularReward
                ? `${redemptionCounts[mostPopularReward.rewardId] ?? 0} redemptions`
                : "no redemptions yet"}
              positive={!!mostPopularReward}
            />
          </div>

          {/* ── Two-column layout: catalog + add panel ─────────────────────── */}
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">

            {/* LEFT: Catalog ───────────────────────────────────────────────── */}
            <div className="min-w-0">

              {/* Search + sort + count row */}
              {!loadingRewards && rewards.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-8 h-9 text-sm"
                      placeholder="Search rewards…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <Select value={sort} onValueChange={v => setSort(v as SortKey)}>
                    <SelectTrigger className="h-9 w-44 text-sm">
                      <ArrowUpDown className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popular">Most Popular</SelectItem>
                      <SelectItem value="pts_asc">Points: Low → High</SelectItem>
                      <SelectItem value="pts_desc">Points: High → Low</SelectItem>
                      <SelectItem value="name">Name A–Z</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {filteredRewards.length} of {rewards.length}
                  </span>
                </div>
              )}

              {/* Catalog grid */}
              {loadingRewards ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="overflow-hidden rounded-xl border border-border">
                      <Skeleton className="h-24 w-full" />
                      <div className="space-y-2 p-4">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-8 w-full mt-3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredRewards.length === 0 ? (
                rewards.length === 0 ? <CatalogEmpty /> : (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
                    <Search className="mb-2 h-7 w-7 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No rewards match "{search}"</p>
                    <button onClick={() => setSearch("")} className="mt-1 text-xs text-primary hover:underline">
                      Clear search
                    </button>
                  </div>
                )
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredRewards.map(r => (
                    <RewardCard
                      key={r.rewardId}
                      reward={r}
                      redemptionCount={redemptionCounts[r.rewardId] ?? 0}
                      maxRedemptions={maxRedemptions}
                      isMostPopular={r.rewardId === mostPopularId && (redemptionCounts[mostPopularId] ?? 0) > 0}
                      tenantId={tenantId}
                      programId={programId}
                      idToken={idToken ?? null}
                      onRedeemed={() => void fetchTransactions()}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT: Add reward panel (sticky on desktop) ─────────────────── */}
            <div ref={addPanelRef} className="lg:sticky lg:top-6 lg:self-start space-y-4">
              <AddRewardPanel
                tenantId={tenantId}
                programId={programId}
                idToken={idToken ?? null}
                onCreated={() => void fetchRewards()}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Reward Card ───────────────────────────────────────────────────────────────

interface RewardCardProps {
  reward: Reward;
  redemptionCount: number;
  maxRedemptions: number;
  isMostPopular: boolean;
  tenantId: string;
  programId: string;
  idToken: string | null;
  onRedeemed: () => void;
}

function RewardCard({
  reward, redemptionCount, maxRedemptions, isMostPopular,
  tenantId, programId, idToken, onRedeemed,
}: RewardCardProps) {
  const [showRedeem, setShowRedeem] = useState(false);
  const [memberId, setMemberId]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const tier = getTier(reward.pointsCost);
  const TierIcon = tier.icon;
  const barWidth = maxRedemptions > 0 ? Math.round((redemptionCount / maxRedemptions) * 100) : 0;

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId.trim()) return;
    setSubmitting(true);
    try {
      const res = await redeem(
        tenantId, programId,
        { memberId: memberId.trim(), rewardId: reward.rewardId },
        idToken ?? undefined
      );
      toast.success(`Redeemed "${reward.name}" — new balance: ${res.balance} pts`);
      setMemberId(""); setShowRedeem(false);
      onRedeemed();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Redeem failed");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">

      {/* Tier gradient header */}
      <div className={cn("relative bg-gradient-to-br px-4 py-3 text-white", tier.gradient)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <TierIcon className="h-3.5 w-3.5 opacity-90" />
            <span className="text-xs font-semibold uppercase tracking-widest opacity-90">
              {tier.label}
            </span>
          </div>
          {isMostPopular && (
            <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm">
              <Flame className="h-2.5 w-2.5" /> Hot
            </span>
          )}
        </div>
        <p className="mt-1.5 text-2xl font-bold tabular-nums leading-none">
          {reward.pointsCost.toLocaleString("en-IN")}
          <span className="ml-1 text-sm font-normal opacity-80">pts</span>
        </p>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-4">
        <p className="font-semibold text-foreground leading-snug">{reward.name}</p>

        {/* Redemption bar */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {redemptionCount === 0
                ? "No redemptions yet"
                : `${redemptionCount} redemption${redemptionCount !== 1 ? "s" : ""}`}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", tier.gradient)}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            variant={showRedeem ? "secondary" : "default"}
            className="flex-1 text-sm"
            onClick={() => setShowRedeem(s => !s)}
          >
            {showRedeem ? "Cancel" : "Redeem for member"}
          </Button>
        </div>

        {/* Inline redeem form */}
        {showRedeem && (
          <form onSubmit={handleRedeem} className="mt-3 space-y-2 border-t border-border pt-3">
            <Label className="text-xs text-muted-foreground">Member ID</Label>
            <Input
              value={memberId}
              onChange={e => setMemberId(e.target.value)}
              placeholder="e.g. priya_001"
              required
              disabled={submitting}
              className="h-8 text-sm"
              autoFocus
            />
            <Button
              type="submit"
              size="sm"
              className="w-full"
              disabled={submitting || !memberId.trim()}
            >
              {submitting
                ? "Processing…"
                : `Confirm — ${reward.pointsCost.toLocaleString("en-IN")} pts`}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Add Reward Panel ──────────────────────────────────────────────────────────

interface AddRewardPanelProps {
  tenantId: string;
  programId: string;
  idToken: string | null;
  onCreated: () => void;
}

function AddRewardPanel({ tenantId, programId, idToken, onCreated }: AddRewardPanelProps) {
  const [name, setName]             = useState("");
  const [pointsCost, setPointsCost] = useState(100);
  const [submitting, setSubmitting] = useState(false);
  const tier = getTier(pointsCost);
  const TierIcon = tier.icon;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createReward(
        tenantId, programId,
        { name: name.trim(), pointsCost: Math.max(1, pointsCost) },
        idToken ?? undefined
      );
      setName(""); setPointsCost(100);
      toast.success("Reward added to catalog");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create reward");
    } finally { setSubmitting(false); }
  }

  function applyTemplate(t: { name: string; pointsCost: number }) {
    setName(t.name);
    setPointsCost(t.pointsCost);
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">

      {/* Panel header */}
      <div className="border-b border-border bg-secondary/40 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Plus className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Add Reward</p>
            <p className="text-xs text-muted-foreground">Create a new catalog item</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleCreate} className="p-5 space-y-4">

        {/* Live tier preview */}
        <div className={cn(
          "flex items-center gap-3 rounded-lg bg-gradient-to-br px-3 py-2.5 text-white",
          tier.gradient
        )}>
          <TierIcon className="h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{name || "Reward name"}</p>
            <p className="text-xs opacity-80">{tier.label} · {pointsCost.toLocaleString("en-IN")} pts</p>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="rw-name" className="text-xs font-medium">Reward name</Label>
          <Input
            id="rw-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Free Coffee"
            disabled={submitting}
          />
        </div>

        {/* Points slider + input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="rw-pts" className="text-xs font-medium">Points cost</Label>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1", tier.badge)}>
              {tier.label}
            </span>
          </div>
          <Input
            id="rw-pts"
            type="number"
            min={1}
            max={99999}
            value={pointsCost}
            onChange={e => setPointsCost(Math.max(1, Number(e.target.value)))}
            disabled={submitting}
          />
          <input
            type="range"
            min={1}
            max={2000}
            step={5}
            value={pointsCost}
            onChange={e => setPointsCost(Number(e.target.value))}
            disabled={submitting}
            className="w-full h-1.5 cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>1</span><span>500</span><span>1000</span><span>2000+</span>
          </div>
        </div>

        <Button type="submit" disabled={submitting || !name.trim()} className="w-full">
          {submitting ? "Adding…" : "Add to Catalog"}
        </Button>
      </form>

      {/* Quick templates */}
      <div className="border-t border-border px-5 pb-5 pt-4">
        <div className="mb-2 flex items-center gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">Quick templates</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map(t => (
            <button
              key={t.name}
              type="button"
              onClick={() => applyTemplate(t)}
              className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:border-primary/30"
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Empty states ──────────────────────────────────────────────────────────────

function EmptyPrograms() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-14 text-center">
      <Gift className="mb-3 h-10 w-10 text-muted-foreground/30" />
      <p className="text-sm font-medium text-foreground">No programs yet</p>
      <p className="mt-1 text-xs text-muted-foreground">Create a program first on the Programs page.</p>
    </div>
  );
}

function CatalogEmpty() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-14 text-center">
      <Gift className="mb-3 h-10 w-10 text-muted-foreground/30" />
      <p className="text-sm font-medium text-foreground">No rewards in catalog yet</p>
      <p className="mt-1 text-xs text-muted-foreground">Use the panel on the right to add your first reward.</p>
    </div>
  );
}
