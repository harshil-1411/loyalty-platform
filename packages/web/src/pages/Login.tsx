import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
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
import { cn } from "@/lib/utils";

export function Login() {
  const navigate = useNavigate();
  const { state, signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (state.status === "authenticated") {
    const dest = state.user.role === "super_admin" ? "/admin" : "/";
    navigate(dest, { replace: true });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(username.trim(), password);
      // After signIn, state refreshes and the redirect above will fire
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className={cn("w-full max-w-[400px] border-border shadow-lg")}>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold tracking-tight">Sign in</CardTitle>
          <CardDescription>Loyalty Platform</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-username">Username or email</Label>
              <Input
                id="login-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                className="transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="transition-colors"
              />
            </div>
            <div className="flex justify-end">
              <Button variant="link" asChild className="h-auto p-0 text-sm text-muted-foreground">
                <Link to="/forgot-password">Forgot password?</Link>
              </Button>
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 text-center text-sm">
            <span className="text-muted-foreground">Don&apos;t have an account?</span>
            <Button variant="link" asChild className="p-0 text-primary">
              <Link to="/signup">Sign up</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
