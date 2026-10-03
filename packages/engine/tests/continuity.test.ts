import { describe, expect, it } from "vitest";
import { evaluateContinuity } from "../src/continuity.ts";
import type { Draft, RecipientRecord } from "../src/schemas.ts";

const ADDRESS_A = "4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY";
const ADDRESS_B = "4yfuQCL4fnNfSbBgqFcPTFn5GGZABDaEFQLhGpwjizcY";
const SENDER = "5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc";

function draft(overrides: Partial<Draft> = {}): Draft {
  return {
    cluster: "mainnet-beta",
    sender: SENDER,
    recipientId: "rec-1",
    recipientRevision: 1,
    destination: ADDRESS_A,
    asset: "SOL",
    amountRaw: "1000",
    ...overrides,
  };
}

function recipient(overrides: Partial<RecipientRecord> = {}): RecipientRecord {
  return {
    id: "rec-1",
    cluster: "mainnet-beta",
    address: ADDRESS_A,
    label: "Contributor",
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

describe("evaluateContinuity", () => {
  it("returns exact for a confirmed saved recipient", () => {
    const result = evaluateContinuity(draft(), recipient());
    expect(result.continuity).toBe("exact");
  });

  it("returns mismatch when the destination differs, including lookalikes", () => {
    const result = evaluateContinuity(draft({ destination: ADDRESS_B }), recipient());
    expect(result.continuity).toBe("mismatch");
    expect(result.reasonCodes).toContain("continuity.mismatch");
  });

  it("returns not_selected when no recipient is chosen", () => {
    const result = evaluateContinuity(
      draft({ recipientId: null, recipientRevision: null }),
      null,
    );
    expect(result.continuity).toBe("not_selected");
  });

  it("returns unconfirmed for an unconfirmed record even on exact address", () => {
    const result = evaluateContinuity(
      draft(),
      recipient({ confirmationStatus: "unconfirmed", confirmedAt: null }),
    );
    expect(result.continuity).toBe("unconfirmed");
  });

  it("treats a stale recipient revision as unconfirmed", () => {
    const result = evaluateContinuity(draft({ recipientRevision: 1 }), recipient({ revision: 2 }));
    expect(result.continuity).toBe("unconfirmed");
    expect(result.reasonCodes).toContain("continuity.revision_stale");
  });

  it("does not return exact when recipient cluster differs from draft cluster", () => {
    const result = evaluateContinuity(
      draft({ cluster: "mainnet-beta" }),
      recipient({ cluster: "devnet" }),
    );
    expect(result.continuity).toBe("mismatch");
    expect(result.reasonCodes).toContain("continuity.cluster_mismatch");
  });

  it("returns exact only when cluster, revision, confirmation, and address match", () => {
    const result = evaluateContinuity(
      draft({ cluster: "devnet" }),
      recipient({ cluster: "devnet" }),
    );
    expect(result.continuity).toBe("exact");
  });
});
