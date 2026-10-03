import { describe, expect, it } from "vitest";
import { capturedMonitorResponse, monitorUnavailable } from "../src/lib/monitor-capture.ts";

function bundle() {
  return { version: 1, capturedAt: 1000, snapshot: {
    version: 1, sessionId: "test", source: { cluster: "mainnet-beta", origin: "chain", mode: "live", provider: "solami" },
    state: "running", startedAt: 1, heartbeatAt: 1000, watchCount: 1, assets: ["SOL"], historyWindowHours: 48,
    coverage: "partial", warnings: [], metrics: { received: 1, retained: 1, duplicates: 0, ignored: 0, evicted: 0,
      reconnects: 0, restarts: 0, lastSlot: 10, cursor: 1, processingSamples: 1, processingMeanMs: 1 }, gaps: [], findings: [],
  } };
}
describe("deployment-bundled historical monitor", () => {
  it("forces an exported live snapshot into historical/stopped presentation", () => {
    const result = capturedMonitorResponse(bundle());
    expect(result?.status).toBe("captured"); expect(result?.snapshot.source.mode).toBe("historical");
    expect(result?.snapshot.state).toBe("stopped"); expect(result?.capturedAt).toBe(1000);
  });
  it("does not relabel synthetic or replay examples as historical mainnet evidence", () => {
    const synthetic = bundle(); synthetic.snapshot.source.origin = "synthetic";
    expect(capturedMonitorResponse(synthetic)).toBeNull();
    const replay = bundle(); replay.snapshot.source.mode = "replay";
    expect(capturedMonitorResponse(replay)).toBeNull();
  });
  it("handles missing or malformed captures without inventing results", () => {
    expect(capturedMonitorResponse({})).toBeNull();
    expect(capturedMonitorResponse({ version: 1, capturedAt: 1000, snapshot: { garbage: true } })).toBeNull();
  });
  it("serves the bundled mainnet capture as historical evidence, never as live activity", () => {
    const result = monitorUnavailable("Worker unavailable.");
    expect(result.status).toBe("captured");
    if (result.status !== "captured") return;
    expect(result.snapshot.source.origin).toBe("chain");
    expect(result.snapshot.source.cluster).toBe("mainnet-beta");
    expect(result.snapshot.source.mode).toBe("historical");
    expect(result.snapshot.state).toBe("stopped");
    expect(result.snapshot.metrics.retained).toBeGreaterThan(0);
    expect(result.message).toMatch(/not current activity/i);
  });
});
