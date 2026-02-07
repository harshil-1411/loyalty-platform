import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import { getIdToken } from "@/auth/cognito";
import type { Program } from "@/api/programs";
import { listPrograms } from "@/api/programs";
import { getBalance, earn, burn } from "@/api/transactions";
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
                <CardHeader>
                  <CardTitle className="text-base">Transaction history</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Transaction history will be available when the API supports listing transactions.
                  </p>
                  <div className="mt-3 overflow-hidden rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-4 py-2 text-left font-medium">Date</th>
                          <th className="px-4 py-2 text-left font-medium">Type</th>
                          <th className="px-4 py-2 text-right font-medium">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                            No transactions yet
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
