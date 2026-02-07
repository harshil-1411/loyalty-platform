/**
 * Task 4.3: Razorpay webhook handler. Verifies signature, updates tenant billing on subscription events.
 */
import { createHmac } from 'crypto';
import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, getTableName } from '../db';

const tableName = () => getTableName();

function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  return signature === expected;
}

function getTenantIdFromPayload(payload: unknown): string | null {
  try {
    const p = payload as { subscription?: { entity?: { notes?: Record<string, string> } } };
    const notes = p?.subscription?.entity?.notes;
    return (notes && (notes.tenant_id || notes.tenantId)) || null;
  } catch {
    return null;
  }
}

async function updateTenantBilling(
  tenantId: string,
  updates: { billingStatus?: string; currentPeriodEnd?: string; razorpaySubscriptionId?: string }
): Promise<void> {
  const pk = `TENANT#${tenantId}`;
  const sk = 'TENANT';
  const res = await docClient.send(new GetCommand({ TableName: tableName(), Key: { pk, sk } }));
  const now = new Date().toISOString();
  const item = res.Item
    ? { ...res.Item, ...updates, updatedAt: now }
    : { pk, sk, ...updates, createdAt: now, updatedAt: now };
  await docClient.send(new PutCommand({ TableName: tableName(), Item: item }));
}

export async function handleRazorpayWebhook(
  rawBody: string,
  signature: string | undefined
): Promise<APIGatewayProxyResultV2> {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Webhook: RAZORPAY_WEBHOOK_SECRET not set');
    return { statusCode: 500, body: JSON.stringify({ error: 'Webhook not configured' }) };
  }
  if (!signature || !verifySignature(rawBody, signature, secret)) {
    console.error('Webhook: signature verification failed');
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid signature' }) };
  }

  let payload: { event?: string; payload?: unknown };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error('Webhook: invalid JSON');
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const event = payload.event;
  const tenantId = getTenantIdFromPayload(payload.payload);

  if (!tenantId) {
    console.warn('Webhook: no tenant_id in payload notes', event);
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  }

  if (event === 'subscription.charged' || event === 'subscription.activated') {
    const p = payload.payload as { subscription?: { entity?: { id?: string; current_end?: number } } };
    const sub = p?.subscription?.entity;
    const currentEnd = sub?.current_end
      ? new Date((sub.current_end as number) * 1000).toISOString()
      : undefined;
    await updateTenantBilling(tenantId, {
      billingStatus: 'active',
      currentPeriodEnd: currentEnd,
      razorpaySubscriptionId: sub?.id,
    });
    console.log('Webhook: subscription active', tenantId, sub?.id);
  } else if (event === 'subscription.cancelled' || event === 'subscription.completed') {
    await updateTenantBilling(tenantId, { billingStatus: 'cancelled' });
    console.log('Webhook: subscription cancelled/completed', tenantId);
  } else {
    console.log('Webhook: ignored event', event);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
}
