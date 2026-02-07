/**
 * Task 4.2: Subscription creation — create Razorpay subscription and return checkout link.
 */
import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { getRazorpayPlanId } from '../billing';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, getTableName } from '../db';

const tableName = () => getTableName();

async function createRazorpaySubscription(
  planId: string,
  tenantId: string,
  customerEmail?: string
): Promise<{ short_url: string; id: string }> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay keys not configured');
  }
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/subscriptions', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan_id: planId,
      total_count: 12,
      quantity: 1,
      notes: { tenant_id: tenantId },
      customer_notify: 1,
      ...(customerEmail && { customer_id: undefined }), // Razorpay allows customer_email in subscription link API
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('Razorpay subscription create failed', res.status, err);
    throw new Error(`Razorpay error: ${res.status}`);
  }
  const data = (await res.json()) as { short_url?: string; id?: string };
  return { short_url: data.short_url ?? '', id: data.id ?? '' };
}

export async function createSubscriptionLink(
  tenantId: string,
  body: { planKey: string; email?: string }
): Promise<APIGatewayProxyResultV2> {
  const planId = getRazorpayPlanId(body.planKey || '');
  if (!planId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid or missing planKey (starter|growth|scale)' }) };
  }
  try {
    const { short_url, id } = await createRazorpaySubscription(planId, tenantId, body.email);
    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shortUrl: short_url, subscriptionId: id }),
    };
  } catch (e) {
    console.error('createSubscriptionLink', e);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: e instanceof Error ? e.message : 'Failed to create subscription link' }),
    };
  }
}

export async function getBillingStatus(tenantId: string): Promise<APIGatewayProxyResultV2> {
  const { pk, sk } = { pk: `TENANT#${tenantId}`, sk: 'TENANT' };
  const res = await docClient.send(new GetCommand({ TableName: tableName(), Key: { pk, sk } }));
  const item = res.Item;
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      planId: item?.planId ?? null,
      billingStatus: item?.billingStatus ?? 'none',
      currentPeriodEnd: item?.currentPeriodEnd ?? null,
      razorpaySubscriptionId: item?.razorpaySubscriptionId ?? null,
    }),
  };
}
