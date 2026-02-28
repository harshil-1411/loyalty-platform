import { describe, it, expect, vi, beforeEach } from "vitest";
import * as client from "./client";
import { setMyTenant } from "./me";

vi.mock("./client");

describe("me API", () => {
  const tenantId = "acme-corp";
  const idToken = "tok";

  beforeEach(() => {
    vi.mocked(client.apiPatch).mockResolvedValue({ tenantId: "new-t", updated: true });
  });

  it("setMyTenant calls apiPatch with correct path and body", async () => {
    const res = await setMyTenant(tenantId, { tenantId: "new-t" }, idToken);
    expect(client.apiPatch).toHaveBeenCalledWith(
      "/api/v1/me/tenant",
      tenantId,
      { tenantId: "new-t" },
      idToken
    );
    expect(res.tenantId).toBe("new-t");
    expect(res.updated).toBe(true);
  });

  it("setMyTenant works without idToken", async () => {
    await setMyTenant(tenantId, { tenantId: "x" });
    expect(client.apiPatch).toHaveBeenCalledWith(
      "/api/v1/me/tenant",
      tenantId,
      { tenantId: "x" },
      undefined
    );
  });

  it("propagates errors from apiPatch", async () => {
    vi.mocked(client.apiPatch).mockRejectedValue(new Error("BAD_REQUEST"));
    await expect(setMyTenant(tenantId, { tenantId: "" })).rejects.toThrow("BAD_REQUEST");
  });
});
