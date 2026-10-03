import { describe, expect, it } from "vitest";
import { DraftSchema, RecipientRecordSchema, TransferEventSchema } from "../src/schemas.ts";

describe("schemas", () => {
  it("rejects floating-point amount strings", () => {
    const parsed = DraftSchema.safeParse({
      cluster: "mainnet-beta",
      sender: "5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc",
      recipientId: null,
      recipientRevision: null,
      destination: "4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY",
      asset: "SOL",
      amountRaw: "1.5",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts integer amount strings and recipient revisions", () => {
    const draft = DraftSchema.parse({
      cluster: "devnet",
      sender: "5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc",
      recipientId: "r1",
      recipientRevision: 2,
      destination: "4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY",
      asset: "SOL",
      amountRaw: "1000",
    });
    expect(draft.recipientRevision).toBe(2);

    const recipient = RecipientRecordSchema.parse({
      id: "r1",
      cluster: "devnet",
      address: draft.destination,
      label: "Test",
      confirmationStatus: "unconfirmed",
      confirmationMethod: null,
      confirmedAt: null,
      revision: 1,
      createdAt: 1,
      updatedAt: 1,
      addressHistory: [],
    });
    expect(recipient.confirmationStatus).toBe("unconfirmed");
  });

  it("keeps transfer event ids as cluster-independent instruction paths in the payload", () => {
    const event = TransferEventSchema.parse({
      id: "mainnet-beta:sig:0.1",
      cluster: "mainnet-beta",
      signature: "sig",
      slot: 10,
      instructionPath: "0.1",
      blockTime: null,
      observedAt: 1,
      fromOwner: null,
      toOwner: null,
      asset: "SOL",
      amountRaw: "0",
      decimals: 9,
      resolution: "unresolved",
    });
    expect(event.blockTime).toBeNull();
    expect(event.resolution).toBe("unresolved");
  });
});
