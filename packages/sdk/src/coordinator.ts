import {
  CoverageEnvelopeSchema,
  TransferEventSchema,
  poisoningHistoryAssets,
  type CheckResult,
  type CoverageEnvelope,
  type Draft,
  type RecipientRecord,
  type TransferEvent,
} from "@doppel/engine";
import { combineCheck, draftFingerprint } from "./combine.ts";

export const DEFAULT_CHECK_TTL_MS = 30_000;

export type CheckLookup = (input: {
  draft: Draft;
  historyAssets: string[];
  signal: AbortSignal;
}) => Promise<{ events: TransferEvent[]; coverage: CoverageEnvelope }>;

export type BoundCheck = {
  fingerprint: string;
  checkedAt: number;
  expiresAt: number;
  result: CheckResult;
  events: TransferEvent[];
  coverage: CoverageEnvelope;
};

export type CoordinatorSnapshot = {
  stage: "idle" | "checking" | "ready" | "stale" | "changed" | "cancelled" | "failed";
  bound: BoundCheck | null;
  stale: boolean;
  combined: CheckResult;
  historyLimitAcknowledged: boolean;
};

export class CheckCoordinator {
  private generation = 0;
  private controller: AbortController | null = null;
  private bound: BoundCheck | null = null;
  private stage: CoordinatorSnapshot["stage"] = "idle";
  private context: string | null = null;
  private historyLimitAcknowledged = false;

  private readonly lookup: CheckLookup;
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(
    lookup: CheckLookup,
    ttlMs = DEFAULT_CHECK_TTL_MS,
    now: () => number = () => Date.now(),
  ) {
    this.lookup = lookup;
    this.ttlMs = ttlMs;
    this.now = now;
  }

  cancel(): void {
    this.controller?.abort();
    this.controller = null;
    this.generation += 1;
    this.stage = "cancelled";
    this.bound = null;
    this.historyLimitAcknowledged = false;
  }

  private bindContext(draft: Draft, recipient: RecipientRecord | null): void {
    const context = JSON.stringify([draftFingerprint(draft), recipient]);
    if (this.context !== null && this.context !== context) {
      this.cancel();
      this.stage = "changed";
    }
    this.context = context;
  }

  acknowledgeHistoryLimit(draft: Draft, recipient: RecipientRecord | null): boolean {
    const snap = this.snapshot(draft, recipient);
    if (snap.stale || !snap.combined.reasonCodes.includes("policy.history_acknowledgment_required")) {
      return false;
    }
    this.historyLimitAcknowledged = true;
    return true;
  }

  currentFingerprint(): string | null {
    return this.bound?.fingerprint ?? null;
  }

  allowsWalletRequest(draft: Draft, recipient: RecipientRecord | null): boolean {
    const snap = this.snapshot(draft, recipient);
    return !snap.stale && snap.combined.action === "ready_for_confirmation";
  }

  snapshot(draft: Draft, recipient: RecipientRecord | null): CoordinatorSnapshot {
    this.bindContext(draft, recipient);
    const fingerprint = draftFingerprint(draft);
    const now = this.now();
    const bound = this.bound;
    const changed = bound !== null && bound.fingerprint !== fingerprint;
    const expired = bound !== null && now >= bound.expiresAt;
    const stale = changed || expired || this.stage !== "ready";
    if (stale) this.historyLimitAcknowledged = false;
    const coverage: CoverageEnvelope | CoverageEnvelope["status"] = bound?.coverage ?? "unavailable";
    const combined = combineCheck({
      draft,
      recipient,
      events: changed ? [] : (bound?.events ?? []),
      coverage: changed ? "unavailable" : coverage,
      now,
      stale: bound === null ? true : stale,
      unresolvedSupportedTransfer: changed ? false : (bound?.coverage.unresolvedEventCount ?? 0) > 0,
      historyLimitAcknowledged: this.historyLimitAcknowledged,
    });
    return {
      stage: changed ? "changed" : expired ? "stale" : this.stage,
      bound,
      stale: bound === null ? true : stale,
      combined,
      historyLimitAcknowledged: this.historyLimitAcknowledged,
    };
  }

  async run(draft: Draft, recipient: RecipientRecord | null): Promise<CoordinatorSnapshot> {
    this.bindContext(draft, recipient);
    draft = { ...draft };
    this.bound = null;
    this.historyLimitAcknowledged = false;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const generation = this.generation + 1;
    this.generation = generation;
    this.stage = "checking";
    const fingerprint = draftFingerprint(draft);
    try {
      const history = await new Promise<{ events: TransferEvent[]; coverage: CoverageEnvelope }>(
        (resolve, reject) => {
          const onAbort = () => {
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          };
          if (controller.signal.aborted) {
            onAbort();
            return;
          }
          controller.signal.addEventListener("abort", onAbort, { once: true });
          this.lookup({
            draft,
            historyAssets: poisoningHistoryAssets(draft.cluster),
            signal: controller.signal,
          })
            .then((value) => {
              controller.signal.removeEventListener("abort", onAbort);
              resolve(value);
            })
            .catch((error: unknown) => {
              controller.signal.removeEventListener("abort", onAbort);
              reject(error);
            });
        },
      );
      if (generation !== this.generation || controller.signal.aborted) {
        throw Object.assign(new Error("superseded_check"), { name: "AbortError" });
      }
      if (draftFingerprint(draft) !== fingerprint) {
        this.stage = "changed";
        return this.snapshot(draft, recipient);
      }
      const now = this.now();
      const coverage = CoverageEnvelopeSchema.parse(history.coverage);
      if (coverage.wallet !== draft.sender || coverage.cluster !== draft.cluster) {
        throw new Error("history_context_mismatch");
      }
      history.events = history.events.map((event) => TransferEventSchema.parse(event));
      if (history.events.some((event) => event.cluster !== draft.cluster)) {
        throw new Error("history_event_cluster_mismatch");
      }
      const result = combineCheck({
        draft,
        recipient,
        events: history.events,
        coverage: history.coverage,
        now,
        stale: false,
        unresolvedSupportedTransfer: history.coverage.unresolvedEventCount > 0,
      });
      this.bound = {
        fingerprint,
        checkedAt: now,
        expiresAt: now + Math.max(0, this.ttlMs - (coverage.cacheAgeSeconds ?? 0) * 1000),
        result,
        events: history.events,
        coverage: history.coverage,
      };
      this.stage = "ready";
      return this.snapshot(draft, recipient);
    } catch (error) {
      if (generation !== this.generation) throw Object.assign(new Error("superseded_check"), { name: "AbortError" });
      if ((error as Error).name === "AbortError" || controller.signal.aborted) {
        this.stage = "cancelled";
        return this.snapshot(draft, recipient);
      }
      this.stage = "failed";
      const now = this.now();
      const coverage: CoverageEnvelope = {
        status: "unavailable",
        wallet: draft.sender,
        cluster: draft.cluster,
        origin: "chain",
        mode: "historical",
        provider: null,
        ruleVersion: "0.1",
        checkedAt: now,
        requestedFrom: null,
        requestedTo: null,
        observedFrom: null,
        observedTo: null,
        lastEvaluatedSlot: null,
        requestedTransactionCount: 0,
        fetchedTransactionCount: 0,
        tokenAccountDiscovery: "unavailable",
        unsupportedEventCount: 0,
        unresolvedEventCount: 0,
        limitReason: "lookup_failed",
        cacheAgeSeconds: null,
        warnings: [error instanceof Error ? error.message : "lookup_failed"],
      };
      const result = combineCheck({
        draft,
        recipient,
        events: [],
        coverage,
        now,
        stale: false,
        unresolvedSupportedTransfer: false,
      });
      this.bound = {
        fingerprint,
        checkedAt: now,
        expiresAt: now + this.ttlMs,
        result,
        events: [],
        coverage,
      };
      return this.snapshot(draft, recipient);
    }
  }
}
