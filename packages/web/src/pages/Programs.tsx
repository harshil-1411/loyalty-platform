import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import { getIdToken } from "@/auth/cognito";
import type { Program } from "@/api/programs";
import {
  listPrograms,
  createProgram,
  getProgram,
  updateProgram,
} from "@/api/programs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type View = "list" | "create" | "edit";

export function Programs() {
  const { state } = useAuth();
  const [view, setView] = useState<View>("list");
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [idToken, setIdToken] = useState<string | null>(null);

  const tenantId = state.status === "authenticated" ? state.user.sub : "";

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
      setPrograms(res.programs ?? []);
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
    if (tenantId) fetchPrograms();
  }, [tenantId, idToken, fetchPrograms]);

  if (state.status !== "authenticated") return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Programs</h2>
        <Button onClick={() => setView("create")}>Create program</Button>
      </div>

      {view === "list" && (
        <>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {loading ? (
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-md" />
              ))}
            </div>
          ) : programs.length === 0 ? (
            <p className="text-muted-foreground">No programs yet. Create one to get started.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
              {programs.map((p) => (
                <li
                  key={p.programId}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground">{p.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {p.currency} · {p.programId}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedProgramId(p.programId);
                      setView("edit");
                    }}
                  >
                    Edit
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {view === "create" && (
        <ProgramForm
          tenantId={tenantId}
          idToken={idToken}
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
          idToken={idToken}
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
        <CardTitle>New program</CardTitle>
        <CardDescription>Create a loyalty program</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="program-name">Name</Label>
            <Input
              id="program-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Loyalty Program"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="program-currency">Currency</Label>
            <Input
              id="program-currency"
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="INR"
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </CardContent>
        <CardFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create"}
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
        <CardTitle>Edit program</CardTitle>
        <CardDescription>{programId}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-program-name">Name</Label>
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
            <Input
              id="edit-program-currency"
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={loading}
            />
          </div>
          {saveError && (
            <p className="text-sm text-destructive" role="alert">
              {saveError}
            </p>
          )}
        </CardContent>
        <CardFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
