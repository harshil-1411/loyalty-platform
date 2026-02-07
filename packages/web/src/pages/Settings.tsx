import { useState, useEffect } from "react";
import { useAuth } from "@/auth/useAuth";
import { getIdToken } from "@/auth/cognito";
import { setMyTenant } from "@/api/me";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/** Tenant id used for API X-Tenant-Id when authorizer is used (custom_tenant_id or default). */
export function getEffectiveTenantId(user: { custom_tenant_id?: string; sub: string }): string {
  return (user.custom_tenant_id && user.custom_tenant_id.trim()) || "default";
}

export function Settings() {
  const { state } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [loading, setLoading] = useState(false);
  const [idToken, setIdToken] = useState<string | null>(null);

  if (state.status !== "authenticated") return null;

  const currentTenant = getEffectiveTenantId(state.user);

  useEffect(() => {
    getIdToken().then(setIdToken);
  }, []);

  async function handleSetTenant(e: React.FormEvent) {
    e.preventDefault();
    const value = tenantId.trim();
    if (!value) {
      toast.error("Enter a tenant ID");
      return;
    }
    setLoading(true);
    try {
      await setMyTenant(currentTenant, { tenantId: value }, idToken ?? undefined);
      toast.success("Tenant updated. Sign out and sign in again for it to take effect.");
      setTenantId("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update tenant";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container max-w-2xl space-y-6 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Set your tenant ID. This is stored in your Cognito profile and used for all API calls.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Current tenant: <strong>{currentTenant}</strong>
            {currentTenant === "default" && " (set a tenant to associate your account with an organization)"}
          </p>
          <form onSubmit={handleSetTenant} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="tenantId">Tenant ID</Label>
              <Input
                id="tenantId"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="e.g. acme-corp"
                disabled={loading}
                className="mt-1"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating…" : "Set tenant"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            After updating, sign out and sign in again so your new tenant is used.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
