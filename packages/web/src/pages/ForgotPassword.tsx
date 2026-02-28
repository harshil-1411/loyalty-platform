import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword, confirmForgotPassword } from "@/auth/cognito";
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

export function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(username.trim());
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await confirmForgotPassword(username.trim(), code.trim(), newPassword);
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-[400px] border-border shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {step === "request" ? "Reset password" : "Set new password"}
          </CardTitle>
          <CardDescription>
            {step === "request"
              ? "Enter your username and we'll send a reset code to your email."
              : `A verification code was sent to the email on your account. Enter it below.`}
          </CardDescription>
        </CardHeader>

        {step === "request" ? (
          <form onSubmit={handleRequest}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fp-username">Username or email</Label>
                <Input
                  id="fp-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending…" : "Send reset code"}
              </Button>
            </CardContent>
          </form>
        ) : (
          <form onSubmit={handleConfirm}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fp-code">Verification code</Label>
                <Input
                  id="fp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fp-new-password">New password</Label>
                <Input
                  id="fp-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Resetting…" : "Reset password"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm"
                onClick={() => { setStep("request"); setError(""); }}
                disabled={loading}
              >
                Resend code
              </Button>
            </CardContent>
          </form>
        )}

        <CardFooter className="flex justify-center text-sm">
          <Button variant="link" asChild className="p-0 text-primary">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
