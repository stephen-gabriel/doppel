import type { HistoryEnvelope, HistoryRequest } from "./types.ts";

type Entry = {
  key: string;
  value: HistoryEnvelope;
  storedAt: number;
};

export class HistoryCache {
  private readonly entries = new Map<string, Entry>();

  private readonly ttlMs: number;
  private readonly now: () => number;

  private readonly maxEntries: number;
  constructor(ttlMs: number, now: () => number = () => Date.now(), maxEntries = 100) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) throw new Error("Invalid cache capacity.");
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.now = now;
  }

  key(request: HistoryRequest): string {
    return [request.cluster, request.wallet, [...request.assets].sort().join(","), request.maxTransactions].join("|");
  }

  get(request: HistoryRequest): HistoryEnvelope | null {
    const key = this.key(request);
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }
    const age = this.now() - entry.storedAt;
    if (age >= this.ttlMs || age < 0) {
      this.entries.delete(key);
      return null;
    }
    this.entries.delete(key); this.entries.set(key, entry);
    return {
      events: structuredClone(entry.value.events),
      coverage: {
        ...structuredClone(entry.value.coverage),
        cacheAgeSeconds: Math.floor(age / 1000),
      },
    };
  }

  set(request: HistoryRequest, value: HistoryEnvelope): void {
    for (const [key, entry] of this.entries) {
      if (this.now() - entry.storedAt >= this.ttlMs) this.entries.delete(key);
    }
    this.entries.delete(this.key(request));
    while (this.entries.size >= this.maxEntries) this.entries.delete(this.entries.keys().next().value!);
    this.entries.set(this.key(request), {
      key: this.key(request),
      value: structuredClone(value),
      storedAt: this.now(),
    });
  }
}
