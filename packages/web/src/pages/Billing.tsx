import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import { getIdToken } from "@/auth/cognito";
import { t, formatDateIndia } from "@/i18n";
import { getBillingStatus, createSubscriptionLink } from "@/api/billing";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

/** Map a raw API error message to a user-friendly string. */
function friendlyBillingError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("401") || lower.includes("unauthorized")) {
    return "Payment gateway is not configured yet. Please contact support.";
  }
  if (lower.includes("invalid") && lower.includes("plan")) {
    return "Invalid plan selected. Please try again.";
  }
  return raw || "Something went wrong. Please try again.";
}

export function Billing() {
  const { state } = useAuth();
  const [status, setStatus] = useState<{
    planId: string | null;
    billingStatus: string;
    currentPeriodEnd: string | null;
    razorpaySubscriptionId: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // undefined = token not yet fetched; null = no session; string = valid token
  const [idToken, setIdToken] = useState<string | null | undefined>(undefined);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const tenantId = state.status === "authenticated" ? state.user.custom_tenant_id || state.user.sub : "";

  const fetchToken = useCallback(async () => {
    const tok = await getIdToken();
    setIdToken(tok);
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError("");
    try {
      const s = await getBillingStatus(tenantId, idToken ?? undefined);
      setStatus(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load billing status");
    } finally {
      setLoading(false);
    }
  }, [tenantId, idToken]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  useEffect(() => {
    if (tenantId && idToken !== undefined) void fetchStatus();
  }, [tenantId, idToken, fetchStatus]);

  async function handleSubscribe(planKey: string) {
    if (!tenantId) return;
    setSubscribing(planKey);
    setError("");
    try {
      const res = await createSubscriptionLink(
        tenantId,
        { planKey },
        idToken ?? undefined
      );
      if (res.shortUrl) {
        toast.info("Redirecting to checkout…");
        window.location.href = res.shortUrl;
      } else {
        const msg = "No checkout URL returned. Please try again.";
        setError(msg);
        toast.error(msg);
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Failed to start subscription";
      const msg = friendlyBillingError(raw);
      setError(msg);
      toast.error(msg);
    } finally {
      setSubscribing(null);
    }
  }

  if (state.status !== "authenticated") return null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        {t("billing.title")}
      </h2>

      {/* Test mode hint — only visible in local dev (Vite sets import.meta.env.DEV = true) */}
      {import.meta.env.DEV && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
          <p className="font-semibold text-amber-800 dark:text-amber-300">
            Test Mode — Use these Razorpay test payment details at checkout
          </p>
          <div className="mt-2 space-y-1 font-mono text-xs text-amber-700 dark:text-amber-400">
            <p>Card 1:&nbsp; 5267 3181 8797 5449 &nbsp;|&nbsp; CVV: 123 &nbsp;|&nbsp; Expiry: 12/25</p>
            <p>Card 2:&nbsp; 5104 0600 0000 0008 &nbsp;|&nbsp; CVV: 123 &nbsp;|&nbsp; Expiry: 12/25</p>
            <p>UPI ID: success@razorpay</p>
          </div>
        </div>
      )}

      {error && (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-10 w-48" />
        </div>
      ) : (
        <>
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t("billing.status")}</CardTitle>
              <CardDescription>Current subscription and billing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                <strong>{t("billing.plan")}:</strong> {status?.planId ?? "—"}
              </p>
              <p>
                <strong>Billing:</strong> {status?.billingStatus ?? "none"}
              </p>
              {status?.currentPeriodEnd && (
                <p>
                  <strong>{t("billing.currentPeriodEnd")}:</strong>{" "}
                  {formatDateIndia(status.currentPeriodEnd)}
                </p>
              )}
            </CardContent>
          </Card>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">
              {t("billing.choosePlan")}
            </h3>
            <div className="flex flex-wrap gap-3">
              {(["starter", "growth", "scale"] as const).map((key) => (
                <Button
                  key={key}
                  onClick={() => handleSubscribe(key)}
                  disabled={!!subscribing}
                >
                  {t(`billing.${key}`)} {subscribing === key ? "…" : t("billing.subscribe")}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
