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

type Step = "form" | "confirm";

export function SignUp() {
  const navigate = useNavigate();
  const { state, signUp, confirmSignUp } = useAuth();
  const [step, setStep] = useState<Step>("form");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (state.status === "authenticated") {
    navigate("/", { replace: true });
    return null;
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signUp(username.trim(), email.trim(), password);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await confirmSignUp(username, code.trim());
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed");
    } finally {
      setLoading(false);
    }
  }

  if (step === "confirm") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <Card className={cn("w-full max-w-[400px] border-border shadow-lg")}>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Confirm your email
            </CardTitle>
            <CardDescription>We sent a code to {email}</CardDescription>
          </CardHeader>
          <form onSubmit={handleConfirm}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-code">Confirmation code</Label>
                <Input
                  id="signup-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  required
                  disabled={loading}
                  className="transition-colors"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Confirming…" : "Confirm"}
              </Button>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 text-center text-sm">
              <Button variant="link" type="button" onClick={() => setStep("form")} className="p-0">
                Back
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className={cn("w-full max-w-[400px] border-border shadow-lg")}>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold tracking-tight">Create account</CardTitle>
          <CardDescription>Loyalty Platform</CardDescription>
        </CardHeader>
        <form onSubmit={handleSignUp}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-username">Username</Label>
              <Input
                id="signup-username"
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
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password (min 10 chars, upper, lower, digit)</Label>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={10}
                disabled={loading}
                className="transition-colors"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Sign up"}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 text-center text-sm">
            <span className="text-muted-foreground">Already have an account?</span>
            <Button variant="link" asChild className="p-0 text-primary">
              <Link to="/login">Sign in</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
