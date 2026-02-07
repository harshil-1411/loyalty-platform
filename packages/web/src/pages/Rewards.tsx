import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import { getIdToken } from "@/auth/cognito";
import type { Program } from "@/api/programs";
import type { Reward } from "@/api/rewards";
import { listPrograms } from "@/api/programs";
import { listRewards, createReward, redeem } from "@/api/rewards";
import { formatINR } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type Tab = "catalog" | "redeem";

export function Rewards() {
  const { state } = useAuth();
  const [tab, setTab] = useState<Tab>("catalog");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState("");
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [error, setError] = useState("");
  const [idToken, setIdToken] = useState<string | null>(null);

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

  const fetchRewards = useCallback(async () => {
    if (!tenantId || !programId) return;
    setLoadingRewards(true);
    setError("");
    try {
      const res = await listRewards(tenantId, programId, idToken ?? undefined);
      setRewards(res.rewards ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load rewards");
      setRewards([]);
    } finally {
      setLoadingRewards(false);
    }
  }, [tenantId, programId, idToken]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  useEffect(() => {
    if (tenantId) void fetchPrograms();
  }, [tenantId, idToken, fetchPrograms]);

  useEffect(() => {
    if (programId) void fetchRewards();
    else setRewards([]);
  }, [programId, fetchRewards]);

  if (state.status !== "authenticated") return null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">Rewards</h2>

      {loadingPrograms ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : programs.length === 0 ? (
        <p className="text-muted-foreground">Create a program first (Programs page).</p>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Program</Label>
            <Select value={programId} onValueChange={setProgramId}>
              <SelectTrigger className="w-full max-w-[320px]">
                <SelectValue placeholder="Select program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.programId} value={p.programId}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList>
              <TabsTrigger value="catalog">Catalog</TabsTrigger>
              <TabsTrigger value="redeem">Redeem</TabsTrigger>
            </TabsList>
            <TabsContent value="catalog">
              <RewardsCatalog
                rewards={rewards}
                loading={loadingRewards}
                tenantId={tenantId}
                programId={programId}
                idToken={idToken}
                onCreated={() => void fetchRewards()}
                setError={setError}
              />
            </TabsContent>
            <TabsContent value="redeem">
              <RedeemFlow
                rewards={rewards}
                loading={loadingRewards}
                tenantId={tenantId}
                programId={programId}
                idToken={idToken}
                setError={setError}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

interface RewardsCatalogProps {
  rewards: Reward[];
  loading: boolean;
  tenantId: string;
  programId: string;
  idToken: string | null;
  onCreated: () => void;
  setError: (s: string) => void;
}

function RewardsCatalog({
  rewards,
  loading,
  tenantId,
  programId,
  idToken,
  onCreated,
  setError,
}: RewardsCatalogProps) {
  const [name, setName] = useState("");
  const [pointsCost, setPointsCost] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setSubmitting(true);
    try {
      await createReward(
        tenantId,
        programId,
        { name: name.trim(), pointsCost: Math.max(0, pointsCost) },
        idToken ?? undefined
      );
      setName("");
      setPointsCost(10);
      toast.success("Reward added");
      onCreated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Create failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Rewards catalog</h3>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : rewards.length === 0 ? (
          <p className="text-muted-foreground">No rewards yet. Add one below.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
            {rewards.map((r) => (
              <li
                key={r.rewardId}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
              >
                <span className="font-medium text-foreground">{r.name}</span>
                <span className="text-sm text-primary">
                  {r.pointsCost} pts ({formatINR(r.pointsCost)} equiv.)
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Card className="max-w-md border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Add reward</CardTitle>
          <CardDescription>Add a new reward to the catalog</CardDescription>
        </CardHeader>
        <form onSubmit={handleCreate}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reward-name">Name</Label>
              <Input
                id="reward-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Free coffee"
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reward-points">Points cost</Label>
              <Input
                id="reward-points"
                type="number"
                min={0}
                value={pointsCost}
                onChange={(e) => setPointsCost(Number(e.target.value))}
                disabled={submitting}
              />
            </div>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? "Adding…" : "Add reward"}
            </Button>
          </CardContent>
        </form>
      </Card>
    </>
  );
}

interface RedeemFlowProps {
  rewards: Reward[];
  loading: boolean;
  tenantId: string;
  programId: string;
  idToken: string | null;
  setError: (s: string) => void;
}

function RedeemFlow({
  rewards,
  loading,
  tenantId,
  programId,
  idToken,
  setError,
}: RedeemFlowProps) {
  const [memberId, setMemberId] = useState("");
  const [rewardId, setRewardId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId.trim() || !rewardId) return;
    setError("");
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await redeem(
        tenantId,
        programId,
        { memberId: memberId.trim(), rewardId },
        idToken ?? undefined
      );
      setSuccess(`Redeemed! New balance: ${res.balance} pts.`);
      toast.success("Reward redeemed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Redeem failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="max-w-md border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Redeem reward</CardTitle>
        <CardDescription>
          Select a member and reward to deduct points and complete redemption.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : rewards.length === 0 ? (
          <p className="text-muted-foreground">Add rewards in the Catalog tab first.</p>
        ) : (
          <form onSubmit={handleRedeem} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="redeem-member">Member ID</Label>
              <Input
                id="redeem-member"
                type="text"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="e.g. member_123"
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label>Reward</Label>
              <Select value={rewardId} onValueChange={setRewardId} disabled={submitting}>
                <SelectTrigger id="redeem-reward" className="w-full">
                  <SelectValue placeholder="Select reward" />
                </SelectTrigger>
                <SelectContent>
                  {rewards.map((r) => (
                    <SelectItem key={r.rewardId} value={r.rewardId}>
                      {r.name} — {r.pointsCost} pts
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {success && (
              <p className="text-sm text-green-600 dark:text-green-400" role="status">
                {success}
              </p>
            )}
            <Button type="submit" disabled={submitting || !memberId.trim() || !rewardId}>
              {submitting ? "Redeeming…" : "Redeem"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
