import type { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { handler as helloHandler } from './hello';
import * as programs from './programs';
import * as transactions from './transactions';
import * as rewards from './rewards';
import * as webhookRazorpay from './webhook-razorpay';
import * as billing from './billing';

const TENANT_HEADER = 'x-tenant-id';

function getTenantId(event: APIGatewayProxyEventV2): string | null {
  const h = event.headers?.[TENANT_HEADER] ?? event.headers?.['X-Tenant-Id'];
  return (typeof h === 'string' ? h : null) || null;
}

export const handler: APIGatewayProxyHandlerV2 = async (event): Promise<APIGatewayProxyResultV2> => {
  const path = event.requestContext?.http?.path ?? event.rawPath ?? '';
  const method = (event.requestContext?.http?.method ?? 'GET').toUpperCase();

  if (path === '/api/v1/hello' && method === 'GET') {
    const res = await (helloHandler as (e: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2>)(event);
    return res;
  }

  if (path === '/api/v1/webhooks/razorpay' && method === 'POST') {
    const body = typeof event.body === 'string' ? event.body : '';
    const sig = event.headers?.['x-razorpay-signature'] ?? event.headers?.['X-Razorpay-Signature'];
    return webhookRazorpay.handleRazorpayWebhook(body, typeof sig === 'string' ? sig : undefined);
  }

  const tenantId = getTenantId(event);

  if (path === '/api/v1/billing/status' && method === 'GET' && tenantId) {
    return billing.getBillingStatus(tenantId);
  }
  if (path === '/api/v1/billing/subscription-link' && method === 'POST' && tenantId) {
    const body = event.body ? JSON.parse(event.body) : {};
    return billing.createSubscriptionLink(tenantId, body);
  }

  if (!tenantId && path.startsWith('/api/v1/programs')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Missing X-Tenant-Id header' }) };
  }

  if (path === '/api/v1/programs' && method === 'GET') return programs.listPrograms(tenantId!);
  if (path === '/api/v1/programs' && method === 'POST') {
    const body = event.body ? JSON.parse(event.body) : {};
    return programs.createProgram(tenantId!, body);
  }

  const programMatch = path.match(/^\/api\/v1\/programs\/([^/]+)$/);
  if (programMatch) {
    const programId = programMatch[1];
    if (method === 'GET') return programs.getProgram(tenantId!, programId);
    if (method === 'PUT') {
      const body = event.body ? JSON.parse(event.body) : {};
      return programs.updateProgram(tenantId!, programId, body);
    }
  }

  if (path.match(/^\/api\/v1\/programs\/[^/]+\/earn$/) && method === 'POST') {
    const programId = path.split('/')[4];
    const body = event.body ? JSON.parse(event.body) : {};
    return transactions.earn(tenantId!, programId, body);
  }
  if (path.match(/^\/api\/v1\/programs\/[^/]+\/burn$/) && method === 'POST') {
    const programId = path.split('/')[4];
    const body = event.body ? JSON.parse(event.body) : {};
    return transactions.burn(tenantId!, programId, body);
  }
  if (path.match(/^\/api\/v1\/programs\/[^/]+\/balance\/[^/]+$/) && method === 'GET') {
    const parts = path.split('/');
    const programId = parts[4];
    const memberId = parts[6];
    return transactions.getBalance(tenantId!, programId, memberId);
  }

  if (path.match(/^\/api\/v1\/programs\/[^/]+\/rewards$/) && method === 'GET') {
    const programId = path.split('/')[4];
    return rewards.listRewards(tenantId!, programId);
  }
  if (path.match(/^\/api\/v1\/programs\/[^/]+\/rewards$/) && method === 'POST') {
    const programId = path.split('/')[4];
    const body = event.body ? JSON.parse(event.body) : {};
    return rewards.createReward(tenantId!, programId, body);
  }
  if (path.match(/^\/api\/v1\/programs\/[^/]+\/redeem$/) && method === 'POST') {
    const programId = path.split('/')[4];
    const body = event.body ? JSON.parse(event.body) : {};
    return rewards.redeem(tenantId!, programId, body);
  }

  return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
};
