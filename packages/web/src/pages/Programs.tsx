import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Gift, Layers, PencilLine, Plus, ReceiptText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { getIdToken } from "@/auth/cognito";
import type { Program } from "@/api/programs";
import {
  listPrograms,
  createProgram,
  getProgram,
  updateProgram,
} from "@/api/programs";
import { listRewards } from "@/api/rewards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const CURRENCIES = [
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function shortId(id: string): string {
  // Show last 8 chars of the programId as a readable reference
  return id.slice(-8).toUpperCase();
}

type View = "list" | "create" | "edit";

export function Programs() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>("list");
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [rewardCounts, setRewardCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // undefined = token not yet fetched; null = no session; string = valid token
  const [idToken, setIdToken] = useState<string | null | undefined>(undefined);

  const tenantId = state.status === "authenticated" ? state.user.custom_tenant_id || state.user.sub : "";

  const fetchToken = useCallback(async () => {
    const t = await getIdToken();
    setIdToken(t);
  }, []);

  const fetchPrograms = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError("");
    try {
      const res = await listPrograms(tenantId, idToken ?? undefined);
      const progs = res.programs ?? [];
      setPrograms(progs);
      // Load reward counts for all programs in parallel (non-blocking)
      const counts = await Promise.all(
        progs.map((p) =>
          listRewards(tenantId, p.programId, idToken ?? undefined)
            .then((r) => ({ id: p.programId, count: r.rewards?.length ?? 0 }))
            .catch(() => ({ id: p.programId, count: 0 }))
        )
      );
      setRewardCounts(Object.fromEntries(counts.map((c) => [c.id, c.count])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load programs");
    } finally {
      setLoading(false);
    }
  }, [tenantId, idToken]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  useEffect(() => {
    if (tenantId && idToken !== undefined) fetchPrograms();
  }, [tenantId, idToken, fetchPrograms]);

  if (state.status !== "authenticated") return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Programs</h2>
        {view === "list" && (
          <Button onClick={() => setView("create")}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Program
          </Button>
        )}
      </div>

      {view === "list" && (
        <>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-36 w-full rounded-xl" />
              ))}
            </div>
          ) : programs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
              <Layers className="mb-4 h-10 w-10 text-muted-foreground/50" />
              <p className="text-base font-medium text-foreground">No programs yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a loyalty program to start rewarding your customers.
              </p>
              <Button className="mt-6" onClick={() => setView("create")}>
                <Plus className="mr-1.5 h-4 w-4" />
                New Program
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {programs.map((p) => (
                <div
                  key={p.programId}
                  className="group flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Layers className="h-5 w-5 text-primary" />
                    </div>
                    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {CURRENCY_SYMBOLS[p.currency] ?? ""} {p.currency}
                    </span>
                  </div>

                  <div className="mt-3">
                    <p className="font-semibold text-foreground">{p.name}</p>
                    {p.createdAt && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Created {formatDate(p.createdAt)}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Gift className="h-3 w-3" />
                        {rewardCounts[p.programId] ?? "—"} rewards
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground/50">
                        #{shortId(p.programId)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProgramId(p.programId);
                        setView("edit");
                      }}
                    >
                      <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => navigate("/transactions")}
                    >
                      <ReceiptText className="mr-1.5 h-3.5 w-3.5" />
                      Transactions
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => navigate("/rewards")}
                    >
                      <Gift className="mr-1.5 h-3.5 w-3.5" />
                      Rewards
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === "create" && (
        <ProgramForm
          tenantId={tenantId}
          idToken={idToken ?? null}
          onSuccess={() => {
            toast.success("Program created");
            setView("list");
            fetchPrograms();
          }}
          onCancel={() => setView("list")}
        />
      )}

      {view === "edit" && selectedProgramId && (
        <ProgramEditForm
          tenantId={tenantId}
          idToken={idToken ?? null}
          programId={selectedProgramId}
          onSuccess={() => {
            toast.success("Program updated");
            setSelectedProgramId(null);
            setView("list");
            fetchPrograms();
          }}
          onCancel={() => {
            setSelectedProgramId(null);
            setView("list");
          }}
        />
      )}
    </div>
  );
}

interface ProgramFormProps {
  tenantId: string;
  idToken: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

function ProgramForm({ tenantId, idToken, onSuccess, onCancel }: ProgramFormProps) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await createProgram(
        tenantId,
        { name: name.trim() || undefined, currency },
        idToken ?? undefined
      );
      onSuccess();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Create failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-md border-border shadow-sm">
      <CardHeader>
        <CardTitle>New Program</CardTitle>
        <CardDescription>Set up a loyalty program for your customers</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="program-name">Program name</Label>
            <Input
              id="program-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gold Rewards"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="program-currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency} disabled={loading}>
              <SelectTrigger id="program-currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
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
        </CardContent>
        <CardFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create Program"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

interface ProgramEditFormProps {
  tenantId: string;
  idToken: string | null;
  programId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function ProgramEditForm({
  tenantId,
  idToken,
  programId,
  onSuccess,
  onCancel,
}: ProgramEditFormProps) {
  const [program, setProgram] = useState<Program | null>(null);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!programId) return;
    let cancelled = false;
    getProgram(tenantId, programId, idToken ?? undefined)
      .then((p) => {
        if (!cancelled) {
          setProgram(p);
          setName(p.name ?? "");
          setCurrency(p.currency ?? "INR");
        }
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, programId, idToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError("");
    setLoading(true);
    try {
      await updateProgram(
        tenantId,
        programId,
        { name: name.trim() || undefined, currency },
        idToken ?? undefined
      );
      onSuccess();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Update failed";
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (loadError)
    return (
      <p className="text-sm text-destructive" role="alert">
        {loadError}
      </p>
    );
  if (!program) return <p className="text-muted-foreground">Loading program…</p>;

  return (
    <Card className="max-w-md border-border shadow-sm">
      <CardHeader>
        <CardTitle>Edit Program</CardTitle>
        <CardDescription>{program.name}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-program-name">Program name</Label>
            <Input
              id="edit-program-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-program-currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency} disabled={loading}>
              <SelectTrigger id="edit-program-currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {saveError && (
            <p className="text-sm text-destructive" role="alert">
              {saveError}
            </p>
          )}
        </CardContent>
        <CardFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save Changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
