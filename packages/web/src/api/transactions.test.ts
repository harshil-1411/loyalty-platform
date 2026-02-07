import { describe, it, expect, vi, beforeEach } from "vitest";
import * as client from "./client";
import { getBalance, earn, burn, listTransactions } from "./transactions";

vi.mock("./client");

describe("Transactions API", () => {
  const tenantId = "tenant-1";
  const programId = "prog-1";
  const memberId = "member-1";
  const idToken = "token";

  beforeEach(() => {
    vi.mocked(client.apiGet).mockResolvedValue({});
    vi.mocked(client.apiPost).mockResolvedValue({});
  });

  it("getBalance calls apiGet with correct path", async () => {
    vi.mocked(client.apiGet).mockResolvedValue({
      memberId,
      programId,
      balance: 100,
    });
    const res = await getBalance(tenantId, programId, memberId, idToken);
    expect(client.apiGet).toHaveBeenCalledWith(
      "/api/v1/programs/prog-1/balance/member-1",
      tenantId,
      idToken
    );
    expect(res.balance).toBe(100);
  });

  it("earn calls apiPost with memberId and points", async () => {
    vi.mocked(client.apiPost).mockResolvedValue({
      transactionId: "tx-1",
      balance: 110,
      points: 10,
    });
    const res = await earn(
      tenantId,
      programId,
      { memberId, points: 10 },
      idToken
    );
    expect(client.apiPost).toHaveBeenCalledWith(
      "/api/v1/programs/prog-1/earn",
      tenantId,
      { memberId, points: 10 },
      idToken
    );
    expect(res.balance).toBe(110);
  });

  it("burn calls apiPost with memberId and points", async () => {
    vi.mocked(client.apiPost).mockResolvedValue({
      transactionId: "tx-2",
      balance: 90,
      points: 10,
    });
    const res = await burn(
      tenantId,
      programId,
      { memberId, points: 10 },
      idToken
    );
    expect(client.apiPost).toHaveBeenCalledWith(
      "/api/v1/programs/prog-1/burn",
      tenantId,
      { memberId, points: 10 },
      idToken
    );
    expect(res.balance).toBe(90);
  });

  it("listTransactions calls apiGet with path and optional query params", async () => {
    vi.mocked(client.apiGet).mockResolvedValue({
      transactions: [{ transactionId: "t1", type: "earn", memberId: "m1", points: 10, createdAt: "2025-02-07T12:00:00Z" }],
      nextToken: null,
    });
    const res = await listTransactions(tenantId, programId, { memberId: "m1", limit: 50 }, idToken);
    expect(client.apiGet).toHaveBeenCalledWith(
      "/api/v1/programs/prog-1/transactions?memberId=m1&limit=50",
      tenantId,
      idToken
    );
    expect(res.transactions).toHaveLength(1);
    expect(res.transactions[0].type).toBe("earn");
  });
});
