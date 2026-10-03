import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../src/app/api/monitor/route.ts";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
// A verified mainnet capture is bundled, so unavailable-live paths must fall back to it
// rather than report "offline". These assertions pin that the fallback is real mainnet
// evidence and never presented as live activity.
function expectCapturedFallback(payload: { status: string; snapshot?: { source: { mode: string; origin: string }; state: string } }) {
  expect(payload.status).toBe("captured");
  expect(payload.snapshot?.source.origin).toBe("chain");
  expect(payload.snapshot?.source.mode).toBe("historical");
  expect(payload.snapshot?.state).toBe("stopped");
}
describe("local monitor proxy", () => {
  it("does not contact localhost on production deployments without explicit opt-in", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("MONITOR_LOCAL_ENABLED", "0");
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const response = await GET();
    expectCapturedFallback(await response.json());
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("falls back to captured mainnet evidence with no-cache on unreachable workers or invalid snapshots", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(Response.json({ source: "pretend-live" }));
    vi.stubGlobal("fetch", fetcher);
    expectCapturedFallback(await (await GET()).json());
    const response = await GET();
    expectCapturedFallback(await response.json());
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("refuses invalid configured ports", async () => {
    vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("MONITOR_PORT", "https://other-host");
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expectCapturedFallback(await (await GET()).json());
    expect(fetcher).not.toHaveBeenCalled();
  });
});
