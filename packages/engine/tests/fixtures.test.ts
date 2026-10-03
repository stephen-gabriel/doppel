import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { compareAddresses } from "../src/similarity.ts";
import { evaluateContinuity } from "../src/continuity.ts";
import { evaluatePattern } from "../src/pattern.ts";
import { findAsymmetricPair } from "./helpers/lookalikes.ts";
import type { Draft, RecipientRecord, TransferEvent } from "../src/schemas.ts";

type Manifest = {
  ruleVersion: string;
  cases: Array<{
    id: string;
    kind: string;
    assignment: string;
    origin: string;
    eventReferences: unknown[];
    availableHistory: string;
  }>;
};

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const manifest = JSON.parse(
  readFileSync(join(root, "fixtures", "evaluation-manifest.json"), "utf8"),
) as Manifest;

const SENDER = "5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc";
const REAL = "4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY";
const SPOOF = "4yfuQCL4fnNfSbBgqFcPTFn5GGZABDaEFQLhGpwjizcY";
const NOW = 1_700_000_000_000;

describe("evaluation manifest provenance", () => {
  it("separates address-pair cases from reconstructed incidents", () => {
    const pair = manifest.cases.find((item) => item.id === "DEV-PAIR-PINE-4PLUS1");
    const reconstruction = manifest.cases.find(
      (item) => item.id === "UNRESOLVED-PINE-RECONSTRUCTION",
    );
    expect(pair?.kind).toBe("address-pair");
    expect(pair?.eventReferences).toEqual([]);
    expect(reconstruction?.kind).toBe("historical-chain-reconstruction");
    expect(reconstruction?.availableHistory).toBe("unresolved");
  });

  it("reclassified former holdout cases as development", () => {
    const holdout = manifest.cases.filter((item) => item.assignment === "holdout");
    expect(holdout).toEqual([]);
    expect(manifest.cases.some((item) => item.id === "DEV-CONT-UNRELATED-MISMATCH")).toBe(true);
    expect(manifest.cases.some((item) => item.id === "DEV-PAT-OUTSIDE-WINDOW")).toBe(true);
    expect(manifest.ruleVersion).toBe("0.1");
  });

  it("keeps a separate final-evaluation set that development tests do not score", () => {
    const finalManifest = JSON.parse(
      readFileSync(join(root, "fixtures", "final-evaluation-manifest.json"), "utf8"),
    ) as Manifest;
    const finals = finalManifest.cases.filter((item) => item.assignment === "final-evaluation");
    expect(finals.length).toBeGreaterThanOrEqual(4);
    expect(finals.every((item) => item.id.startsWith("FINAL-"))).toBe(true);
  });
});

describe("manifest-backed regressions", () => {
  it("DEV-PAIR-PINE-4PLUS1 is a 4+1 candidate", () => {
    const comparison = compareAddresses(SPOOF, REAL);
    expect(comparison.status).toBe("different");
    if (comparison.status === "different") {
      expect(comparison.prefix).toBe(4);
      expect(comparison.suffix).toBe(1);
      expect(comparison.candidate).toBe(true);
    }
  });

  it("DEV-PAIR-SYN-1PLUS4 generates a valid 1+4 candidate", () => {
    const pair = findAsymmetricPair(1, 4);
    const comparison = compareAddresses(pair.left, pair.right);
    expect(comparison.status).toBe("different");
    if (comparison.status === "different") {
      expect(comparison.prefix).toBe(1);
      expect(comparison.suffix).toBe(4);
      expect(comparison.candidate).toBe(true);
    }
  });

  it("DEV-CONT-EXACT and DEV-CONT-MISMATCH", () => {
    const recipient: RecipientRecord = {
      id: "rec-1",
      cluster: "devnet",
      address: REAL,
      label: "Contributor",
      confirmationStatus: "confirmed",
      confirmationMethod: "manual_review",
      confirmedAt: 1,
      revision: 1,
      createdAt: 1,
      updatedAt: 1,
      addressHistory: [],
    };
    const exactDraft: Draft = {
      cluster: "devnet",
      sender: SENDER,
      recipientId: "rec-1",
      recipientRevision: 1,
      destination: REAL,
      asset: "SOL",
      amountRaw: "1",
    };
    expect(evaluateContinuity(exactDraft, recipient).continuity).toBe("exact");
    expect(
      evaluateContinuity({ ...exactDraft, destination: SPOOF }, recipient).continuity,
    ).toBe("mismatch");
  });

  it("DEV-CONT-UNRELATED-MISMATCH pauses independently of resemblance", () => {
    const recipient: RecipientRecord = {
      id: "rec-1",
      cluster: "devnet",
      address: REAL,
      label: "Contributor",
      confirmationStatus: "confirmed",
      confirmationMethod: "manual_review",
      confirmedAt: 1,
      revision: 1,
      createdAt: 1,
      updatedAt: 1,
      addressHistory: [],
    };
    const draft: Draft = {
      cluster: "devnet",
      sender: SENDER,
      recipientId: "rec-1",
      recipientRevision: 1,
      destination: SENDER,
      asset: "SOL",
      amountRaw: "1",
    };
    const comparison = compareAddresses(REAL, SENDER);
    expect(comparison.status === "different" ? comparison.candidate : false).toBe(false);
    expect(evaluateContinuity(draft, recipient).continuity).toBe("mismatch");
  });

  it("DEV-PAT-OUTSIDE-WINDOW stays resemblance_only", () => {
    const events: TransferEvent[] = [
      {
        id: "synthetic:pay-old",
        cluster: "local-test",
        signature: "synthetic:pay-old",
        slot: 1,
        instructionPath: "0",
        blockTime: NOW - 80 * 60 * 60 * 1000,
        observedAt: NOW,
        fromOwner: SENDER,
        toOwner: REAL,
        asset: "SOL",
        amountRaw: "2000000",
        decimals: 9,
        resolution: "resolved",
      },
      {
        id: "synthetic:dust-late",
        cluster: "local-test",
        signature: "synthetic:dust-late",
        slot: 2,
        instructionPath: "0",
        blockTime: NOW - 1_000,
        observedAt: NOW,
        fromOwner: SPOOF,
        toOwner: SENDER,
        asset: "SOL",
        amountRaw: "1000",
        decimals: 9,
        resolution: "resolved",
      },
    ];
    const result = evaluatePattern({
      sender: SENDER,
      destination: SPOOF,
      events,
      coverage: "complete_within_scope",
      now: NOW,
    });
    expect(result.pattern).toBe("resemblance_only");
  });
});
