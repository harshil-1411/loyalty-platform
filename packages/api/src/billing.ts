/**
 * Billing/tenant helpers: plan IDs from env, tenant billing fields.
 * Task 4.1: Map internal plan keys to Razorpay plan IDs.
 */
export function getRazorpayPlanId(planKey: string): string | null {
  const env = process.env as Record<string, string | undefined>;
  const map: Record<string, string> = {
    starter: env.RAZORPAY_PLAN_STARTER_ID ?? '',
    growth: env.RAZORPAY_PLAN_GROWTH_ID ?? '',
    scale: env.RAZORPAY_PLAN_SCALE_ID ?? '',
  };
  const id = map[planKey.toLowerCase()];
  return id || null;
}
