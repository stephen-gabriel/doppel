/** Bounded, instance-local throttling. Not a distributed/global quota. */
export class RequestLimiter {
  private readonly hits = new Map<string, { count: number; until: number }>();
  constructor(private readonly max = 10, private readonly windowMs = 60_000, private readonly now = Date.now) {}
  take(key: string): number | null {
    const now = this.now();
    for (const [id, value] of this.hits) if (value.until <= now) this.hits.delete(id);
    if (!this.hits.has(key) && this.hits.size >= 1000) return 60;
    const value = this.hits.get(key) ?? { count: 0, until: now + this.windowMs };
    if (value.count >= this.max) return Math.max(1, Math.ceil((value.until - now) / 1000));
    value.count++; this.hits.set(key, value); return null;
  }
}

export async function readBoundedJson(request: Request, limit = 8192): Promise<unknown> {
  if (Number(request.headers.get("content-length") ?? 0) > limit) throw new Error("request_too_large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid_json");
  let length = 0; let text = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const next = await reader.read(); if (next.done) break;
      length += next.value.byteLength;
      if (length > limit) throw new Error("request_too_large");
      text += decoder.decode(next.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally { await reader.cancel(); }
}
