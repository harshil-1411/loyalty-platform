/**
 * API integration tests — run against deployed API when API_BASE_URL is set.
 * Usage: API_BASE_URL=https://xxx.execute-api.region.amazonaws.com node --test integration/api-integration.test.mjs
 * In CI: set API_BASE_URL to dev API URL; script exits 0 when unset (tests skipped).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';

const BASE = (process.env.API_BASE_URL || '').replace(/\/$/, '');
const TENANT_ID = process.env.API_TEST_TENANT_ID || 'test-tenant-integration';

if (!BASE) {
  console.log('Skipping API integration tests: API_BASE_URL not set');
  process.exit(0);
}

async function request(method, path, body = null, headers = {}) {
  const url = `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID, ...headers },
  };
  if (body != null) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

describe('API integration', () => {
  it('GET /api/v1/hello returns 200', async () => {
    const { status, json } = await request('GET', '/api/v1/hello');
    assert.strictEqual(status, 200);
    assert.ok(json === null || typeof json === 'object');
  });

  it('GET /api/v1/programs without tenant returns 401', async () => {
    const res = await fetch(`${BASE}/api/v1/programs`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    assert.strictEqual(res.status, 401);
  });

  it('Programs CRUD and earn/burn/rewards flow', async () => {
    const { status: listStatus, json: listJson } = await request('GET', '/api/v1/programs');
    assert.strictEqual(listStatus, 200);
    assert.ok(Array.isArray(listJson?.programs));

    const { status: createStatus, json: createJson } = await request('POST', '/api/v1/programs', {
      name: 'Integration Test Program',
      currency: 'INR',
    });
    assert.strictEqual(createStatus, 201);
    const programId = createJson?.programId;
    assert.ok(programId);

    const { status: getStatus } = await request('GET', `/api/v1/programs/${programId}`);
    assert.strictEqual(getStatus, 200);

    const memberId = 'member-integration-' + Date.now();
    const { status: earnStatus, json: earnJson } = await request('POST', `/api/v1/programs/${programId}/earn`, {
      memberId,
      points: 100,
    });
    assert.strictEqual(earnStatus, 200);
    assert.strictEqual(earnJson?.balance, 100);

    const { status: balanceStatus, json: balanceJson } = await request(
      'GET',
      `/api/v1/programs/${programId}/balance/${encodeURIComponent(memberId)}`
    );
    assert.strictEqual(balanceStatus, 200);
    assert.strictEqual(balanceJson?.balance, 100);

    const { status: rewardsListStatus, json: rewardsJson } = await request('GET', `/api/v1/programs/${programId}/rewards`);
    assert.strictEqual(rewardsListStatus, 200);
    assert.ok(Array.isArray(rewardsJson?.rewards));

    const { status: createRewardStatus, json: rewardJson } = await request('POST', `/api/v1/programs/${programId}/rewards`, {
      name: 'Test Reward',
      pointsCost: 30,
    });
    assert.strictEqual(createRewardStatus, 201);
    const rewardId = rewardJson?.rewardId;
    assert.ok(rewardId);

    const { status: redeemStatus, json: redeemJson } = await request('POST', `/api/v1/programs/${programId}/redeem`, {
      memberId,
      rewardId,
    });
    assert.strictEqual(redeemStatus, 200);
    assert.strictEqual(redeemJson?.pointsDeducted, 30);
    assert.strictEqual(redeemJson?.balance, 70);

    const { status: burnStatus, json: burnJson } = await request('POST', `/api/v1/programs/${programId}/burn`, {
      memberId,
      points: 10,
    });
    assert.strictEqual(burnStatus, 200);
    assert.strictEqual(burnJson?.balance, 60);
  });
});
