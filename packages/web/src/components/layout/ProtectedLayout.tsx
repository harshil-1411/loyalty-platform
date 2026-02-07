import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { AppShell } from "./AppShell";

export function ProtectedLayout() {
  const { state } = useAuth();

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (state.status === "disabled") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background px-6 text-center">
        <p className="text-foreground">Auth not configured.</p>
        <p className="text-sm text-muted-foreground">
          Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID.
        </p>
        <p className="text-sm text-muted-foreground">{state.reason}</p>
      </div>
    );
  }

  if (state.status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return <AppShell />;
}
