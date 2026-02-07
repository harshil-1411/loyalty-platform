import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { SuperAdminShell } from "./SuperAdminShell";

/**
 * Route guard that renders the super-admin layout only when the
 * authenticated user has `role === 'super_admin'`.
 *
 * - Loading   → loading indicator
 * - Disabled  → config message (same as ProtectedLayout)
 * - Unauthed  → redirect to /login
 * - Authed but not super_admin → redirect to / (tenant dashboard)
 * - Authed + super_admin → renders <SuperAdminShell />
 */
export function SuperAdminGuard() {
  const { state } = useAuth();

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (state.status === "disabled") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background px-6 text-center">
        <p className="text-foreground">Auth not configured.</p>
        <p className="text-sm text-muted-foreground">
          Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID, or enable
          VITE_SUPER_ADMIN_MODE.
        </p>
      </div>
    );
  }

  if (state.status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  if (state.user.role !== "super_admin") {
    return <Navigate to="/" replace />;
  }

  return <SuperAdminShell />;
}
