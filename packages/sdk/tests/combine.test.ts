import { describe, expect, it } from "vitest";
import {
  MAINNET_USDC_MINT,
  type CoverageEnvelope,
  type Draft,
  type RecipientRecord,
  type TransferEvent,
} from "@doppel/engine";
import { combineCheck } from "../src/combine.ts";

const SENDER = "5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc";
const REAL = "4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY";
const SPOOF = "4yfuQCL4fnNfSbBgqFcPTFn5GGZABDaEFQLhGpwjizcY";

function draft(overrides: Partial<Draft> = {}): Draft {
  return {
    cluster: "mainnet-beta",
    sender: SENDER,
    recipientId: "r1",
    recipientRevision: 1,
    destination: SPOOF,
    asset: "SOL",
    amountRaw: "1",
    ...overrides,
  };
}

function recipient(overrides: Partial<RecipientRecord> = {}): RecipientRecord {
  return {
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
    ...overrides,
  };
}

function coverage(overrides: Partial<CoverageEnvelope> = {}): CoverageEnvelope {
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
    ...overrides,
  };
}

describe("combineCheck", () => {
  it("keeps a local mismatch and pause when chain coverage is unavailable", () => {
    const result = combineCheck({
      draft: draft(),
      recipient: recipient(),
      events: [],
      coverage: coverage({ status: "unavailable" }),
      now: 1,
      stale: false,
    });
    expect(result.continuity).toBe("mismatch");
    expect(result.action).toBe("pause");
  });

  it("reviews when unresolved supported transfers are present even if status is complete", () => {
    const result = combineCheck({
      draft: draft({ destination: REAL }),
      recipient: recipient(),
      events: [],
      coverage: coverage({ unresolvedEventCount: 2 }),
      now: 1,
      stale: false,
    });
    expect(result.action).toBe("review");
    expect(result.reasonCodes).toContain("policy.review");
  });

  it("does not auto-trust an incoming-only contact", () => {
    const events: TransferEvent[] = [
      {
        id: "in",
        cluster: "mainnet-beta",
        signature: "in",
        slot: 1,
        instructionPath: "0",
        blockTime: 1_000,
        observedAt: 1_000,
        fromOwner: SPOOF,
        toOwner: SENDER,
        asset: "SOL",
        amountRaw: "10",
        decimals: 9,
        resolution: "resolved",
      },
    ];
    const result = combineCheck({
      draft: draft({ recipientId: null, recipientRevision: null, destination: SPOOF }),
      recipient: null,
      events,
      coverage: coverage(),
      now: 2_000,
      stale: false,
    });
    expect(result.incomingOnly.value).toBe(true);
    expect(result.action).not.toBe("ready_for_confirmation");
  });

  it("rejects a USDC symbol as an unsupported draft", () => {
    const result = combineCheck({
      draft: draft({ asset: "USDC", destination: REAL }),
      recipient: recipient(),
      events: [],
      coverage: coverage(),
      now: 1,
      stale: false,
    });
    expect(result.reasonCodes).toContain("policy.invalid_or_unsupported_draft");
  });

  it("accepts the canonical mainnet USDC mint as a supported payment asset", () => {
    const result = combineCheck({
      draft: draft({ asset: MAINNET_USDC_MINT, destination: REAL }),
      recipient: recipient(),
      events: [],
      coverage: coverage(),
      now: 1,
      stale: false,
    });
    expect(result.continuity).toBe("exact");
    expect(result.action).toBe("ready_for_confirmation");
  });
});
