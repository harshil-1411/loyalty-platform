import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('programs key format', () => {
  it('program key uses TENANT# and PROGRAM# prefix', () => {
    const tenantId = 't1';
    const programId = 'prog_1';
    const pk = `TENANT#${tenantId}`;
    const sk = `PROGRAM#${programId}`;
    assert.strictEqual(pk, 'TENANT#t1');
    assert.strictEqual(sk, 'PROGRAM#prog_1');
  });
});
