import { apiGet, apiPost } from './client';

export interface BillingStatus {
  planId: string | null;
  billingStatus: string;
  currentPeriodEnd: string | null;
  razorpaySubscriptionId: string | null;
}

export function getBillingStatus(
  tenantId: string,
  idToken?: string | null
): Promise<BillingStatus> {
  return apiGet<BillingStatus>('/api/v1/billing/status', tenantId, idToken);
}

export function createSubscriptionLink(
  tenantId: string,
  body: { planKey: string; email?: string },
  idToken?: string | null
): Promise<{ shortUrl: string; subscriptionId: string }> {
  return apiPost<{ shortUrl: string; subscriptionId: string }>(
    '/api/v1/billing/subscription-link',
    tenantId,
    body,
    idToken
  );
}
