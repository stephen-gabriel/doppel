import type { TransferEvent } from "@doppel/engine";
import type { ReplayStep } from "./replay.ts";

// Published strings used solely to construct a synthetic test. These events,
// amounts and timestamps do not reconstruct the published incident.
export const DEMO_WALLETS = ["5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc"];
export const DEMO_DATASET_ID = "synthetic-poisoning-and-recovery-v1";
const recipient = "4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY";
const lookalike = "4yfuQCL4fnNfSbBgqFcPTFn5GGZABDaEFQLhGpwjizcY";
const epoch = 1_790_899_200_000;
function event(signature: string, slot: number, from: string, to: string, amount: string, path = "0"): TransferEvent {
  return { id: `mainnet-beta:${signature}:${path}`, cluster: "mainnet-beta", signature, slot,
    instructionPath: path, blockTime: epoch + slot * 1000, observedAt: epoch + 120000,
    fromOwner: from, toOwner: to, asset: "SOL", amountRaw: amount, decimals: 9, resolution: "resolved" };
}
const payment = event("synthetic:payment", 100, DEMO_WALLETS[0]!, recipient, "100000000");
const dust = event("synthetic:dust", 110, lookalike, DEMO_WALLETS[0]!, "1000");
export const DEMO_STEPS: readonly ReplayStep[] = [
  // Out-of-order arrival: initially no reference payment exists in the index.
  { type: "event", event: dust },
  { type: "event", event: payment },
  { type: "event", event: { ...dust, observedAt: dust.observedAt + 500 } },
  { type: "disconnect" },
  { type: "recover" },
  { type: "event", event: event("synthetic:refund", 120, recipient, DEMO_WALLETS[0]!, "1000") },
  // Two transfers in the same transaction must not be deduplicated by signature.
  { type: "event", event: event("synthetic:refund", 120, recipient, DEMO_WALLETS[0]!, "2000", "1") },
];
