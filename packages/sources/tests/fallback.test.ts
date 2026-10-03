import { describe, expect, it, vi } from "vitest";
import { FallbackChainReader } from "../src/fallback.ts";
import type { HistoryEnvelope, HistoryRequest } from "../src/types.ts";
import type { TransferEvent } from "@doppel/engine";

const request: HistoryRequest = { cluster: "mainnet-beta", wallet: "5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc", assets: ["SOL"], maxTransactions: 8 };
function history(provider: string, status: "partial" | "unavailable" = "partial"): HistoryEnvelope {
  return { events: [], coverage: { status, wallet: request.wallet, cluster: request.cluster, provider,
    origin: "chain", mode: "historical", ruleVersion: "0.1", checkedAt: 1,
    requestedFrom: null, requestedTo: null, observedFrom: null, observedTo: null, lastEvaluatedSlot: null,
    requestedTransactionCount: 8, fetchedTransactionCount: status === "partial" ? 1 : 0,
    tokenAccountDiscovery: "partial", unsupportedEventCount: 0, unresolvedEventCount: 0,
    limitReason: status === "unavailable" ? "rpc_error" : "transaction_cap", cacheAgeSeconds: null, warnings: [] } };
}
const event: TransferEvent = { id: "mainnet-beta:test:0", cluster: "mainnet-beta", signature: "test", slot: 1,
  instructionPath: "0", blockTime: 1, observedAt: 1, fromOwner: request.wallet,
  toOwner: "4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY", asset: "SOL", amountRaw: "1", decimals: 9, resolution: "resolved" };

describe("mainnet RPC fallback", () => {
  it("falls back after access denial, labels the result and retries the primary after cooldown", async () => {
    let now = 0;
    const primary = { readHistory: vi.fn().mockRejectedValueOnce(new Error("401 secret=never-publish"))
      .mockResolvedValue(history("solami-rpc")) };
    const fallback = { readHistory: vi.fn().mockResolvedValue(history("public-rpc")) };
    const reader = new FallbackChainReader(primary, fallback, { now: () => now });
    const first = await reader.readHistory(request);
    expect(first.coverage.provider).toBe("public-rpc (fallback)");
    expect(JSON.stringify(first)).not.toContain("secret");
    await reader.readHistory(request); expect(primary.readHistory).toHaveBeenCalledOnce();
    now = 60_001;
    expect((await reader.readHistory(request)).coverage.provider).toBe("solami-rpc");
    expect(reader.status().fallbackActive).toBe(false);
  });
  it("detects denied access returned as an unavailable envelope", async () => {
    const primary = { readHistory: vi.fn().mockResolvedValue(history("solami-rpc", "unavailable")) };
    const fallback = { readHistory: vi.fn().mockResolvedValue(history("public-rpc")) };
    expect((await new FallbackChainReader(primary, fallback).readHistory(request)).coverage.provider).toContain("fallback");
  });
  it("does not fail over merely because bounded legitimate history is partial", async () => {
    const primary = { readHistory: vi.fn().mockResolvedValue(history("solami-rpc")) };
    const fallback = { readHistory: vi.fn() };
    await new FallbackChainReader(primary, fallback).readHistory(request);
    expect(fallback.readHistory).not.toHaveBeenCalled();
  });
  it("retains partial primary evidence when the fallback is missing events", async () => {
    const partial = history("solami-rpc"); partial.events = [event]; partial.coverage.limitReason = "partial_fetch";
    const reader = new FallbackChainReader({ readHistory: vi.fn().mockResolvedValue(partial) },
      { readHistory: vi.fn().mockResolvedValue(history("public-rpc")) });
    const result = await reader.readHistory(request);
    expect(result.events).toEqual([event]); expect(result.coverage.status).toBe("partial");
    expect(result.coverage.provider).toContain("solami-rpc + public-rpc");
  });
  it("preserves evidence and requires review if both providers fail", async () => {
    const partial = history("solami-rpc"); partial.events = [event]; partial.coverage.limitReason = "partial_fetch";
    const reader = new FallbackChainReader({ readHistory: vi.fn().mockResolvedValue(partial) },
      { readHistory: vi.fn().mockRejectedValue(new Error("public down")) });
    const result = await reader.readHistory(request);
    expect(result.events).toHaveLength(1); expect(result.coverage.unresolvedEventCount).toBeGreaterThan(0);
  });
  it("cancelling a request never starts fallback traffic", async () => {
    const controller = new AbortController(); controller.abort();
    const fallback = { readHistory: vi.fn() }; const primary = { readHistory: vi.fn() };
    await expect(new FallbackChainReader(primary, fallback).readHistory(request, controller.signal)).rejects.toThrow("aborted");
    expect(primary.readHistory).not.toHaveBeenCalled(); expect(fallback.readHistory).not.toHaveBeenCalled();
  });
});
