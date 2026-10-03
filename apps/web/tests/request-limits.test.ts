import { describe, expect, it } from "vitest";
import { readBoundedJson, RequestLimiter } from "../src/lib/request-limits.ts";
import { CheckRequestSchema } from "../src/lib/check-contract.ts";

describe("Check API input and quota bounds", () => {
  it("limits per-instance requests and permits retry after the window", () => {
    let now = 0; const limiter = new RequestLimiter(2, 1000, () => now);
    expect(limiter.take("a")).toBeNull(); expect(limiter.take("a")).toBeNull();
    expect(limiter.take("a")).toBe(1); expect(limiter.take("b")).toBeNull();
    now = 1000; expect(limiter.take("a")).toBeNull();
  });
  it("bounds actual streamed body size even without content-length", async () => {
    await expect(readBoundedJson(new Request("http://localhost", { method: "POST", body: '"' + "a".repeat(100) + '"' }), 20)).rejects.toThrow("request_too_large");
    await expect(readBoundedJson(new Request("http://localhost", { method: "POST", body: '{"a":1}' }))).resolves.toEqual({ a: 1 });
  });
  it("rejects arbitrary endpoints and oversized schema values", () => {
    const base = { cluster: "devnet", sender: "1".repeat(32), destination: "1".repeat(32), asset: "SOL" };
    expect(CheckRequestSchema.safeParse(base).success).toBe(true);
    expect(CheckRequestSchema.safeParse({ ...base, rpcUrl: "http://other" }).success).toBe(false);
    expect(CheckRequestSchema.safeParse({ ...base, amountRaw: "1".repeat(100) }).success).toBe(false);
  });
});
