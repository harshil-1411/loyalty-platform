import { describe, it, expect, vi, beforeEach } from "vitest";
import * as client from "./client";
import { listRewards, createReward, redeem } from "./rewards";

vi.mock("./client");

describe("Rewards API", () => {
  const tenantId = "tenant-1";
  const programId = "prog-1";
  const idToken = "token";

  beforeEach(() => {
    vi.mocked(client.apiGet).mockResolvedValue({ rewards: [] });
    vi.mocked(client.apiPost).mockResolvedValue({});
  });

  it("listRewards calls apiGet with correct path", async () => {
    vi.mocked(client.apiGet).mockResolvedValue({
      rewards: [{ rewardId: "r1", name: "Coffee", pointsCost: 50 }],
    });
    const res = await listRewards(tenantId, programId, idToken);
    expect(client.apiGet).toHaveBeenCalledWith(
      "/api/v1/programs/prog-1/rewards",
      tenantId,
      idToken
    );
    expect(res.rewards).toHaveLength(1);
    expect(res.rewards[0].name).toBe("Coffee");
  });

  it("createReward calls apiPost with body", async () => {
    vi.mocked(client.apiPost).mockResolvedValue({
      rewardId: "r2",
      name: "Free shipping",
      pointsCost: 100,
    });
    const res = await createReward(
      tenantId,
      programId,
      { name: "Free shipping", pointsCost: 100 },
      idToken
    );
    expect(client.apiPost).toHaveBeenCalledWith(
      "/api/v1/programs/prog-1/rewards",
      tenantId,
      { name: "Free shipping", pointsCost: 100 },
      idToken
    );
    expect(res.rewardId).toBe("r2");
  });

  it("redeem calls apiPost with memberId and rewardId", async () => {
    vi.mocked(client.apiPost).mockResolvedValue({
      transactionId: "tx-1",
      rewardId: "r1",
      pointsDeducted: 50,
      balance: 50,
    });
    const res = await redeem(
      tenantId,
      programId,
      { memberId: "member-1", rewardId: "r1" },
      idToken
    );
    expect(client.apiPost).toHaveBeenCalledWith(
      "/api/v1/programs/prog-1/redeem",
      tenantId,
      { memberId: "member-1", rewardId: "r1" },
      idToken
    );
    expect(res.balance).toBe(50);
  });
});
