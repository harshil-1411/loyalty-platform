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
  const [idToken, setIdToken] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const tenantId = state.status === "authenticated" ? state.user.sub : "";

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
    if (tenantId) void fetchStatus();
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
        setError("No checkout URL returned");
        toast.error("No checkout URL returned");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to start subscription";
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
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
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
