import { describe, it, expect, vi, beforeEach } from "vitest";
import * as client from "./client";
import {
  listPrograms,
  getProgram,
  createProgram,
  updateProgram,
} from "./programs";

vi.mock("./client");

describe("Programs API", () => {
  const tenantId = "tenant-1";
  const idToken = "token";

  beforeEach(() => {
    vi.mocked(client.apiGet).mockResolvedValue({ programs: [] });
    vi.mocked(client.apiPost).mockResolvedValue({});
    vi.mocked(client.apiPut).mockResolvedValue({});
  });

  it("listPrograms calls apiGet with correct path", async () => {
    vi.mocked(client.apiGet).mockResolvedValue({
      programs: [{ programId: "p1", name: "P1", currency: "INR" }],
    });
    const res = await listPrograms(tenantId, idToken);
    expect(client.apiGet).toHaveBeenCalledWith("/api/v1/programs", tenantId, idToken);
    expect(res.programs).toHaveLength(1);
    expect(res.programs[0].name).toBe("P1");
  });

  it("getProgram calls apiGet with programId", async () => {
    vi.mocked(client.apiGet).mockResolvedValue({
      programId: "p1",
      name: "My Program",
      currency: "INR",
    });
    const res = await getProgram(tenantId, "p1", idToken);
    expect(client.apiGet).toHaveBeenCalledWith("/api/v1/programs/p1", tenantId, idToken);
    expect(res.name).toBe("My Program");
  });

  it("createProgram calls apiPost with body", async () => {
    vi.mocked(client.apiPost).mockResolvedValue({
      programId: "p2",
      name: "New",
      currency: "INR",
    });
    const res = await createProgram(
      tenantId,
      { name: "New", currency: "INR" },
      idToken
    );
    expect(client.apiPost).toHaveBeenCalledWith(
      "/api/v1/programs",
      tenantId,
      { name: "New", currency: "INR" },
      idToken
    );
    expect(res.programId).toBe("p2");
  });

  it("updateProgram calls apiPut with programId and body", async () => {
    vi.mocked(client.apiPut).mockResolvedValue({
      programId: "p1",
      updatedAt: "2025-01-01T00:00:00Z",
    });
    await updateProgram(
      tenantId,
      "p1",
      { name: "Updated", currency: "USD" },
      idToken
    );
    expect(client.apiPut).toHaveBeenCalledWith(
      "/api/v1/programs/p1",
      tenantId,
      { name: "Updated", currency: "USD" },
      idToken
    );
  });
});
