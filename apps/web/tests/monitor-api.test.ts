import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../src/app/api/monitor/route.ts";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("local monitor proxy", () => {
  it("does not contact localhost on production deployments without explicit opt-in", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("MONITOR_LOCAL_ENABLED", "0");
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const response = await GET();
    expect((await response.json()).status).toBe("offline");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("returns offline with no-cache on unreachable workers or invalid snapshots", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(Response.json({ source: "pretend-live" }));
    vi.stubGlobal("fetch", fetcher);
    expect((await (await GET()).json()).status).toBe("offline");
    const response = await GET();
    expect((await response.json()).status).toBe("offline");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("refuses invalid configured ports", async () => {
    vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("MONITOR_PORT", "https://other-host");
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect((await (await GET()).json()).status).toBe("offline");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
