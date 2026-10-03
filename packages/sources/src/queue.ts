export class RequestQueue {
  private active = 0;
  private readonly waiting: Array<() => void> = [];
  private nextAllowed = 0;

  private readonly rps: number;
  private readonly now: () => number;
  private readonly wait: (ms: number) => Promise<void>;

  constructor(
    rps: number,
    now: () => number = () => Date.now(),
    wait: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
  ) {
    if (!Number.isFinite(rps) || rps <= 0 || rps > 200) throw new Error("RPC rate must be between 0 and 200 requests/second.");
    this.rps = rps;
    this.now = now;
    this.wait = wait;
  }

  async schedule<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) {
      throw new Error("aborted");
    }
    await this.acquire(signal);
    try {
      const minGap = this.rps > 0 ? Math.ceil(1000 / this.rps) : 0;
      const waitMs = Math.max(0, this.nextAllowed - this.now());
      if (waitMs > 0) {
        await this.wait(waitMs);
      }
      if (signal?.aborted) throw new Error("aborted");
      this.nextAllowed = this.now() + minGap;
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire(signal?: AbortSignal): Promise<void> {
    if (this.active === 0) {
      this.active = 1;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const enter = () => {
        signal?.removeEventListener("abort", onAbort);
        this.active = 1;
        resolve();
      };
      const onAbort = () => {
        const index = this.waiting.indexOf(enter);
        if (index >= 0) this.waiting.splice(index, 1);
        signal?.removeEventListener("abort", onAbort);
        reject(new Error("aborted"));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      this.waiting.push(enter);
      if (signal?.aborted) onAbort();
    });
  }

  private release(): void {
    this.active = Math.max(0, this.active - 1);
    const next = this.waiting.shift();
    if (next) {
      next();
    }
  }
}
