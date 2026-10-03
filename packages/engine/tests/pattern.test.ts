import { describe, expect, it } from "vitest";
import { evaluatePattern } from "../src/pattern.ts";
import type { TransferEvent } from "../src/schemas.ts";

const SENDER = "5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc";
const REAL = "4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY";
const SPOOF = "4yfuQCL4fnNfSbBgqFcPTFn5GGZABDaEFQLhGpwjizcY";
const NOW = 1_700_000_000_000;

function event(overrides: Partial<TransferEvent> & Pick<TransferEvent, "id">): TransferEvent {
  return {
    cluster: "mainnet-beta",
    signature: overrides.id,
    slot: 1,
    instructionPath: "0",
    blockTime: NOW,
    observedAt: NOW,
    fromOwner: SENDER,
    toOwner: REAL,
    asset: "SOL",
    amountRaw: "1000000",
    decimals: 9,
    resolution: "resolved",
    ...overrides,
  };
}

describe("evaluatePattern", () => {
  it("does not treat empty complete history as a safety guarantee", () => {
    const result = evaluatePattern({
      sender: SENDER,
      destination: REAL,
      events: [],
      coverage: "complete_within_scope",
      now: NOW,
    });
    expect(result.pattern).toBe("none_observed");
    expect(result.reasonCodes).toContain("pattern.none_observed");
  });

  it("classifies a lookalike without a qualifying sequence as resemblance_only", () => {
    const result = evaluatePattern({
      sender: SENDER,
      destination: SPOOF,
      events: [
        event({
          id: "pay-real",
          fromOwner: SENDER,
          toOwner: REAL,
          amountRaw: "2000000",
          blockTime: NOW - 3_600_000,
        }),
        event({
          id: "large-incoming",
          fromOwner: SPOOF,
          toOwner: SENDER,
          amountRaw: "500000",
          blockTime: NOW - 1_800_000,
        }),
      ],
      coverage: "complete_within_scope",
      now: NOW,
    });
    expect(result.pattern).toBe("resemblance_only");
    expect(result.incomingOnly.value).toBe(true);
  });

  it("flags outgoing A then dust lookalike B within the window as suspected_poisoning", () => {
    const result = evaluatePattern({
      sender: SENDER,
      destination: SPOOF,
      events: [
        event({
          id: "pay-real",
          fromOwner: SENDER,
          toOwner: REAL,
          amountRaw: "2000000",
          blockTime: NOW - 3_600_000,
        }),
        event({
          id: "dust-spoof",
          fromOwner: SPOOF,
          toOwner: SENDER,
          amountRaw: "1000",
          blockTime: NOW - 1_800_000,
        }),
      ],
      coverage: "complete_within_scope",
      now: NOW,
    });
    expect(result.pattern).toBe("suspected_poisoning");
    expect(result.reasonCodes).toContain("pattern.suspected_poisoning");
  });

  it("does not treat a small refund from the exact previous payee as lookalike poisoning", () => {
    const result = evaluatePattern({
      sender: SENDER,
      destination: REAL,
      events: [
        event({
          id: "pay-real",
          fromOwner: SENDER,
          toOwner: REAL,
          amountRaw: "2000000",
          blockTime: NOW - 3_600_000,
        }),
        event({
          id: "refund",
          fromOwner: REAL,
          toOwner: SENDER,
          amountRaw: "1000",
          blockTime: NOW - 1_800_000,
        }),
      ],
      coverage: "complete_within_scope",
      now: NOW,
    });
    expect(result.pattern).toBe("none_observed");
    expect(result.previouslyPaid.value).toBe(true);
    expect(result.incomingOnly.value).toBe(false);
  });

  it("does not invent a sequence when incoming dust precedes the reference payment", () => {
    const result = evaluatePattern({
      sender: SENDER,
      destination: SPOOF,
      events: [
        event({
          id: "dust-first",
          fromOwner: SPOOF,
          toOwner: SENDER,
          amountRaw: "1000",
          blockTime: NOW - 3_600_000,
        }),
        event({
          id: "pay-later",
          fromOwner: SENDER,
          toOwner: REAL,
          amountRaw: "2000000",
          blockTime: NOW - 1_800_000,
        }),
      ],
      coverage: "complete_within_scope",
      now: NOW,
    });
    expect(result.pattern).toBe("resemblance_only");
  });

  it("returns unknown when coverage is unavailable, even with no events", () => {
    const result = evaluatePattern({
      sender: SENDER,
      destination: REAL,
      events: [],
      coverage: "unavailable",
      now: NOW,
    });
    expect(result.pattern).toBe("unknown");
  });

  it("returns unknown for partial coverage without a qualifying pattern", () => {
    const result = evaluatePattern({
      sender: SENDER,
      destination: REAL,
      events: [],
      coverage: "partial",
      now: NOW,
    });
    expect(result.pattern).toBe("unknown");
  });

  it("does not infer attack timing from observation time when blockTime is missing", () => {
    const result = evaluatePattern({
      sender: SENDER,
      destination: SPOOF,
      events: [
        event({
          id: "pay-real",
          fromOwner: SENDER,
          toOwner: REAL,
          amountRaw: "2000000",
          blockTime: null,
          slot: 10,
          observedAt: NOW - 3_600_000,
        }),
        event({
          id: "dust-spoof",
          fromOwner: SPOOF,
          toOwner: SENDER,
          amountRaw: "1000",
          blockTime: NOW - 1_800_000,
          slot: 11,
        }),
      ],
      coverage: "complete_within_scope",
      now: NOW,
    });
    expect(result.pattern).not.toBe("suspected_poisoning");
    expect(result.reasonCodes).toContain("pattern.timing_unknown");
  });

  it("does not treat a USDC symbol as canonical USDC dust", () => {
    const result = evaluatePattern({
      sender: SENDER,
      destination: SPOOF,
      events: [
        event({
          id: "pay-real",
          fromOwner: SENDER,
          toOwner: REAL,
          amountRaw: "2000000",
          blockTime: NOW - 3_600_000,
        }),
        event({
          id: "symbol-dust",
          fromOwner: SPOOF,
          toOwner: SENDER,
          amountRaw: "1",
          asset: "USDC",
          decimals: 6,
          blockTime: NOW - 1_800_000,
        }),
      ],
      coverage: "complete_within_scope",
      now: NOW,
    });
    expect(result.pattern).toBe("resemblance_only");
    expect(result.reasonCodes).toContain("pattern.incoming_not_dust");
  });

  it("keeps similarity as resemblance, not automatic maliciousness", () => {
    const result = evaluatePattern({
      sender: SENDER,
      destination: SPOOF,
      events: [
        event({
          id: "unrelated-out",
          fromOwner: SENDER,
          toOwner: "11111111111111111111111111111111",
          amountRaw: "1",
          resolution: "unresolved",
        }),
      ],
      coverage: "complete_within_scope",
      now: NOW,
    });
    expect(result.pattern).not.toBe("suspected_poisoning");
  });
});
