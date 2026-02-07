import { describe, it, expect, vi, beforeEach } from "vitest";
import * as client from "./client";
import { getBalance, earn, burn } from "./transactions";

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
});
