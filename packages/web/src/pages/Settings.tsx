import { useState, useEffect } from "react";
import { useAuth } from "@/auth/useAuth";
import { getIdToken, changePassword } from "@/auth/cognito";
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

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Must be before any conditional return (React hooks rule: hooks can't be called after early returns)
  useEffect(() => {
    getIdToken().then(setIdToken);
  }, []);

  if (state.status !== "authenticated") return null;

  const currentTenant = getEffectiveTenantId(state.user);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      toast.error("Both fields are required.");
      return;
    }
    setPwLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      toast.success("Password changed successfully.");
      setOldPassword("");
      setNewPassword("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to change password";
      toast.error(msg);
    } finally {
      setPwLoading(false);
    }
  }

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
          <CardTitle>Organisation</CardTitle>
          <CardDescription>
            Your tenant ID links your account to your organisation's data. Contact your admin if you're unsure what to enter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Active tenant: <strong className="text-foreground">{currentTenant}</strong>
            {currentTenant === "default" && <span className="ml-1 text-amber-600">(not linked — enter your tenant ID below)</span>}
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

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your Cognito account password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="old-password">Current Password</Label>
              <Input
                id="old-password"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Current password"
                disabled={pwLoading}
                className="mt-1"
                autoComplete="current-password"
              />
            </div>
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 8 chars)"
                disabled={pwLoading}
                className="mt-1"
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" disabled={pwLoading}>
              {pwLoading ? "Updating…" : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

    </div>
  );
}
