import { describe, expect, it } from "vitest";
import { MAINNET_USDC_MINT, type CoverageEnvelope, type Draft, type RecipientRecord } from "@doppel/engine";
import { CheckCoordinator } from "../src/coordinator.ts";

const SENDER = "5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc";
const REAL = "4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY";
const SPOOF = "4yfuQCL4fnNfSbBgqFcPTFn5GGZABDaEFQLhGpwjizcY";

function draft(overrides: Partial<Draft> = {}): Draft {
  return {
    cluster: "mainnet-beta",
    sender: SENDER,
    recipientId: "r1",
    recipientRevision: 1,
    destination: REAL,
    asset: MAINNET_USDC_MINT,
    amountRaw: "1000",
    ...overrides,
  };
}

const recipient: RecipientRecord = {
  id: "r1",
  cluster: "mainnet-beta",
  address: REAL,
  label: "Payee",
  confirmationStatus: "confirmed",
  confirmationMethod: "manual_review",
  confirmedAt: 1,
  revision: 1,
  createdAt: 1,
  updatedAt: 1,
  addressHistory: [],
};

function coverage(): CoverageEnvelope {
  return {
    status: "complete_within_scope",
    wallet: SENDER,
    cluster: "mainnet-beta",
    origin: "chain",
    mode: "historical",
    provider: "mock",
    ruleVersion: "0.1",
    checkedAt: 1,
    requestedFrom: null,
    requestedTo: null,
    observedFrom: null,
    observedTo: null,
    lastEvaluatedSlot: 1,
    requestedTransactionCount: 10,
    fetchedTransactionCount: 10,
    tokenAccountDiscovery: "not_applicable",
    unsupportedEventCount: 0,
    unresolvedEventCount: 0,
    limitReason: null,
    cacheAgeSeconds: null,
    warnings: [],
  };
}

describe("CheckCoordinator", () => {
  it("requests poisoning history for SOL and canonical USDC even when paying USDC", async () => {
    let seen: string[] = [];
    const coordinator = new CheckCoordinator(async ({ historyAssets }) => {
      seen = historyAssets;
      return { events: [], coverage: coverage() };
    });
    await coordinator.run(draft(), recipient);
    expect(seen).toEqual(["SOL", MAINNET_USDC_MINT]);
  });

  it("rejects a stale in-flight response after the draft changes", async () => {
    const seen: string[] = [];
    const coordinator = new CheckCoordinator(async ({ draft: current, signal }) => {
      seen.push(current.destination);
      if (signal.aborted) {
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
      if (signal.aborted) {
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      }
      return { events: [], coverage: coverage() };
    });
    const first = coordinator.run(draft(), recipient).catch((error: Error) => error);
    const secondDraft = draft({ destination: SPOOF, amountRaw: "2" });
    const snapshot = await coordinator.run(secondDraft, recipient);
    await first;
    expect(seen[0]).toBe(REAL);
    expect(snapshot.bound?.fingerprint.includes(SPOOF)).toBe(true);
    expect(snapshot.combined.continuity).toBe("mismatch");
  });

  it("marks expiry so ready_for_confirmation cannot be reused", async () => {
    let now = 1_000;
    const coordinator = new CheckCoordinator(
      async () => ({ events: [], coverage: coverage() }),
      30,
      () => now,
    );
    await coordinator.run(draft(), recipient);
    now = 1_040;
    const snapshot = coordinator.snapshot(draft(), recipient);
    expect(snapshot.stale).toBe(true);
    expect(snapshot.combined.action).toBe("review");
  });

  it("binds explicit partial-history acknowledgment to one result and clears it on recheck/cancel", async () => {
    const coordinator = new CheckCoordinator(async () => ({ events: [], coverage: { ...coverage(), status: "partial" } }));
    const value = draft();
    expect((await coordinator.run(value, recipient)).combined.action).toBe("review");
    expect(coordinator.acknowledgeHistoryLimit(value, recipient)).toBe(true);
    expect(coordinator.snapshot(value, recipient).combined.action).toBe("ready_for_confirmation");
    expect(coordinator.snapshot(value, recipient).combined.coverage).toBe("partial");
    expect(coordinator.snapshot(value, recipient).combined.pattern).toBe("unknown");
    expect((await coordinator.run(value, recipient)).historyLimitAcknowledged).toBe(false);
    coordinator.acknowledgeHistoryLimit(value, recipient);
    coordinator.cancel();
    expect(coordinator.allowsWalletRequest(value, recipient)).toBe(false);
  });

  it("never restores an old approval when an edited draft changes back", async () => {
    const coordinator = new CheckCoordinator(async () => ({ events: [], coverage: coverage() }));
    const value = draft();
    await coordinator.run(value, recipient);
    coordinator.snapshot({ ...value, amountRaw: "2" }, recipient);
    expect(coordinator.allowsWalletRequest(value, recipient)).toBe(false);
  });

  it("refuses mismatched history context instead of binding it to the current draft", async () => {
    const coordinator = new CheckCoordinator(async () => ({ events: [], coverage: { ...coverage(), cluster: "devnet" } }));
    const result = await coordinator.run(draft(), recipient);
    expect(result.combined.coverage).toBe("unavailable");
    expect(coordinator.acknowledgeHistoryLimit(draft(), recipient)).toBe(false);
  });

  it("a cancelled/superseded failure cannot overwrite the next successful check", async () => {
    let rejectFirst!: (reason: Error) => void;
    let calls = 0;
    const coordinator = new CheckCoordinator(async () => {
      if (++calls === 1) return new Promise((_, reject) => { rejectFirst = reject; });
      return { events: [], coverage: coverage() };
    });
    const first = coordinator.run(draft(), recipient).catch(() => undefined);
    await coordinator.run(draft({ amountRaw: "2" }), recipient);
    rejectFirst(new Error("late failure"));
    await first;
    expect(coordinator.snapshot(draft({ amountRaw: "2" }), recipient).stage).toBe("ready");
  });
});
