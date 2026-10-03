import { setTimeout as sleep } from "node:timers/promises";
import type { TransferEvent } from "@doppel/engine";
import type { MonitorStore } from "./store.ts";

export type ReplayStep = { type: "event"; event: TransferEvent }
  | { type: "disconnect" } | { type: "recover" };

export class ReplayRunner {
  private readonly controller = new AbortController();
  private readonly store: MonitorStore;
  private readonly steps: readonly ReplayStep[];
  private readonly intervalMs: number;
  constructor(store: MonitorStore, steps: readonly ReplayStep[], intervalMs = 750) {
    this.store = store; this.steps = steps; this.intervalMs = intervalMs;
    if (!Number.isFinite(intervalMs) || intervalMs < 0 || intervalMs > 60_000) throw new Error("Invalid replay interval.");
  }

  async run(): Promise<void> {
    if (this.store.cursor > this.steps.length) throw new Error("Checkpoint is beyond this replay dataset.");
    // This local immutable dataset is fully available; resuming is not evidence of
    // mainnet slot-replay capability. Store rejects this call for a live source.
    this.store.recoverReplay();
    try {
      for (let index = this.store.cursor; index < this.steps.length; index++) {
        if (this.controller.signal.aborted) break;
        const step = this.steps[index]!;
        if (step.type === "event") this.store.ingest(step.event, index + 1);
        else if (step.type === "disconnect") this.store.transition("disconnected", index + 1);
        else this.store.recoverReplay(index + 1);
        if (this.intervalMs) await sleep(this.intervalMs, undefined, { signal: this.controller.signal });
      }
      this.store.transition(this.controller.signal.aborted ? "stopped" : "completed");
    } catch (error) {
      this.store.transition(this.controller.signal.aborted ? "stopped" : "error");
      if (!this.controller.signal.aborted) throw error;
    }
  }

  stop(): void { this.controller.abort(); }
}
