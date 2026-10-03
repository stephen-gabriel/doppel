import { describe, expect, it, vi } from "vitest";
import { RequestQueue } from "../src/queue.ts";
import { HistoryCache } from "../src/cache.ts";
import type { HistoryEnvelope, HistoryRequest } from "../src/types.ts";

describe("bounded free-tier request queue", () => {
  it("a cancelled queued request cannot deadlock the next request", async () => {
    const queue = new RequestQueue(5, Date.now, async () => undefined);
    let release!: () => void;
    const first = queue.schedule(() => new Promise<void>((resolve) => { release = resolve; }));
    await Promise.resolve();
    const controller = new AbortController(); const cancelledTask = vi.fn(async () => 2);
    const second = queue.schedule(cancelledTask, controller.signal).catch((error: Error) => error.message);
    const third = queue.schedule(async () => 3);
    controller.abort(); release(); await first;
    expect(await second).toBe("aborted"); expect(await third).toBe(3);
    expect(cancelledTask).not.toHaveBeenCalled();
  });
  it("spaces requests at the configured free-tier rate", async () => {
    let now = 0; const waits: number[] = [];
    const queue = new RequestQueue(5, () => now, async (ms) => { waits.push(ms); now += ms; });
    await Promise.all([queue.schedule(async () => 1), queue.schedule(async () => 2), queue.schedule(async () => 3)]);
    expect(waits).toEqual([200, 200]);
  });
});

describe("bounded history cache", () => {
  it("expires entries, limits capacity and does not expose mutable cached state", () => {
    let now = 0; const cache = new HistoryCache(1000, () => now, 1);
    const request: HistoryRequest = { wallet: "a", cluster: "devnet", assets: ["SOL"], maxTransactions: 1 };
    const value = { events: [], coverage: { cacheAgeSeconds: null, warnings: ["original"] } } as unknown as HistoryEnvelope;
    cache.set(request, value); cache.get(request)!.coverage.warnings.push("mutation");
    expect(cache.get(request)!.coverage.warnings).toEqual(["original"]);
    cache.set({ ...request, wallet: "b" }, value); expect(cache.get(request)).toBeNull();
    now = 1000; expect(cache.get({ ...request, wallet: "b" })).toBeNull();
  });
});
