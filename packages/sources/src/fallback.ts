import type { ChainReader, HistoryEnvelope, HistoryRequest } from "./types.ts";

export const PUBLIC_FALLBACK_NOTICE = "Primary mainnet RPC is unavailable or access may have expired. Using public Solana RPC with lower request limits; this result is not a live Solami stream.";

/** No paid failover or fixture substitution. Preserve any evidence already read. */
export class FallbackChainReader implements ChainReader {
  private retryAt = 0;
  private fallbackActive = false;
  private readonly primary: ChainReader;
  private readonly fallback: ChainReader;
  private readonly now: () => number;
  private readonly primaryTimeoutMs: number;
  constructor(primary: ChainReader, fallback: ChainReader, options: { now?: () => number; primaryTimeoutMs?: number } = {}) {
    this.primary = primary; this.fallback = fallback;
    this.now = options.now ?? Date.now; this.primaryTimeoutMs = options.primaryTimeoutMs ?? 6000;
  }
  status() { return { fallbackActive: this.fallbackActive, retryPrimaryAt: this.retryAt || null }; }

  async readHistory(request: HistoryRequest, signal?: AbortSignal): Promise<HistoryEnvelope> {
    if (signal?.aborted) throw new Error("aborted");
    let primary: HistoryEnvelope | null = null;
    if (this.now() >= this.retryAt) {
      try {
        const timeout = AbortSignal.timeout(this.primaryTimeoutMs);
        const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
        primary = await new Promise<HistoryEnvelope>((resolve, reject) => {
          const abort = () => reject(new Error("primary_deadline"));
          combined.addEventListener("abort", abort, { once: true });
          this.primary.readHistory(request, combined).then(resolve, reject)
            .finally(() => combined.removeEventListener("abort", abort));
        });
        const failed = primary.coverage.status === "unavailable" || primary.coverage.tokenAccountDiscovery === "unavailable"
          || ["rpc_error", "partial_fetch", "cancelled"].includes(primary.coverage.limitReason ?? "") || timeout.aborted;
        if (!failed) {
          this.retryAt = 0; this.fallbackActive = false;
          return primary;
        }
      } catch { /* A failed primary may contain credentials in its error; never publish it. */ }
      if (signal?.aborted) throw new Error("aborted");
      this.retryAt = this.now() + 60_000;
    }
    this.fallbackActive = true;
    let secondary: HistoryEnvelope;
    try { secondary = await this.fallback.readHistory(request, signal); }
    catch {
      if (signal?.aborted) throw new Error("aborted");
      if (primary && primary.events.length > 0) return { events: primary.events, coverage: {
        ...primary.coverage, status: "partial", provider: "solami-rpc (partial; public fallback unavailable)",
        unresolvedEventCount: Math.max(1, primary.coverage.unresolvedEventCount),
        limitReason: "both_providers_failed", warnings: ["Both providers failed to finish the scan. Previously observed primary events retained for review; retry later."],
      } };
      throw new Error("Mainnet history is unavailable from both providers. Your local saved-address comparison still works; try again later.");
    }
    if (signal?.aborted) throw new Error("aborted");
    const hasPrimaryEvents = (primary?.events.length ?? 0) > 0;
    const events = new Map(secondary.events.map((event) => [event.id, event]));
    let conflict = false;
    for (const event of primary?.events ?? []) {
      const duplicate = events.get(event.id);
      if (duplicate && JSON.stringify({ ...duplicate, observedAt: 0 }) !== JSON.stringify({ ...event, observedAt: 0 })) conflict = true;
      // Retain the primary observation on conflict; force incomplete/review status.
      events.set(event.id, event);
    }
    return {
      events: [...events.values()],
      coverage: {
        ...secondary.coverage,
        status: hasPrimaryEvents ? "partial" : secondary.coverage.status,
        provider: hasPrimaryEvents ? "solami-rpc + public-rpc (fallback)" : "public-rpc (fallback)",
        unresolvedEventCount: Math.max(primary?.coverage.unresolvedEventCount ?? 0, secondary.coverage.unresolvedEventCount, conflict ? 1 : 0),
        limitReason: hasPrimaryEvents ? "provider_failover_partial" : secondary.coverage.limitReason,
        warnings: [PUBLIC_FALLBACK_NOTICE, ...secondary.coverage.warnings,
          ...(hasPrimaryEvents ? ["Partial primary observations were retained. Counts and time range below describe the public-provider scan, not complete combined history."] : []),
          ...(conflict ? ["Providers disagree about an event; review is required."] : [])],
      },
    };
  }
}
