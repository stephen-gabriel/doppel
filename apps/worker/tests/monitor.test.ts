import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DEMO_DATASET_ID, DEMO_STEPS, DEMO_WALLETS } from "../src/demo.ts";
import { MonitorStore, type MonitorConfig } from "../src/store.ts";
import { ReplayRunner } from "../src/replay.ts";
import { monitorServer } from "../src/server.ts";
import { MonitorSnapshotSchema, type TransferEvent } from "@doppel/engine";

const config: MonitorConfig = { wallets: DEMO_WALLETS,
  source: { cluster: "mainnet-beta", origin: "synthetic", mode: "replay", provider: "test replay" },
  datasetId: DEMO_DATASET_ID, maxEvents: 100, windowHours: 48 };
const dirs: string[] = [];
const stores: MonitorStore[] = [];
function store(path = ":memory:", overrides: Partial<MonitorConfig> = {}) {
  const instance = new MonitorStore(path, { ...config, ...overrides }); stores.push(instance); return instance;
}
function eventAt(index: number): TransferEvent {
  const step = DEMO_STEPS[index];
  if (step?.type !== "event") throw new Error("expected event");
  return structuredClone(step.event);
}
afterEach(() => {
  for (const instance of stores.splice(0)) { try { instance.close(); } catch { /* already closed by restart test */ } }
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("focused persistent monitor", () => {
  it("detects a late reference payment, deduplicates delivery and preserves multi-transfer events", async () => {
    const db = store();
    db.ingest(eventAt(0), 1);
    expect(db.snapshot().findings).toHaveLength(0);
    db.ingest(eventAt(1), 2);
    expect(db.snapshot().findings).toHaveLength(1);
    await new ReplayRunner(db, DEMO_STEPS, 0).run();
    const snap = db.snapshot();
    expect(snap.metrics).toMatchObject({ received: 5, retained: 4, duplicates: 1, cursor: 7, reconnects: 1 });
    expect(snap.findings).toHaveLength(1);
    expect(snap.findings[0]?.evidence).toHaveLength(2);
    expect(snap.state).toBe("completed");
    expect(snap.gaps.every((gap) => gap.recoveredAt !== null)).toBe(true);
    expect(snap.source.origin).toBe("synthetic");
  });

  it("resumes SQLite cursor after restart without duplicating events or findings", async () => {
    const dir = mkdtempSync(join(tmpdir(), "doppel-monitor-")); dirs.push(dir);
    const path = join(dir, "monitor.sqlite");
    const first = store(path); first.ingest(eventAt(0), 1); first.close();
    const second = store(path);
    expect(second.cursor).toBe(1);
    expect(second.snapshot().gaps.some((gap) => gap.recoveredAt === null)).toBe(true);
    await new ReplayRunner(second, DEMO_STEPS, 0).run();
    expect(second.snapshot().metrics).toMatchObject({ received: 5, retained: 4, duplicates: 1, restarts: 1 });
    expect(second.snapshot().findings).toHaveLength(1);
    second.close();
    const third = store(path); await new ReplayRunner(third, DEMO_STEPS, 0).run();
    expect(third.snapshot().metrics.received).toBe(5);
  });

  it("keeps retention bounded and exposes evidence loss instead of keeping stale findings", async () => {
    const db = store(":memory:", { maxEvents: 2 });
    await new ReplayRunner(db, DEMO_STEPS, 0).run();
    expect(db.snapshot().metrics.retained).toBe(2);
    expect(db.snapshot().metrics.evicted).toBe(2);
    expect(db.snapshot().findings).toHaveLength(0);
    expect(db.snapshot().gaps.some((gap) => gap.reason.includes("Retention") && gap.recoveredAt === null)).toBe(true);
  });

  it("ignores unrelated events and reports conflicting duplicates without overwriting evidence", () => {
    const db = store(); const event = eventAt(0); db.ingest(event);
    db.ingest({ ...event, amountRaw: "2000" });
    expect(db.snapshot().metrics.retained).toBe(1);
    expect(db.snapshot().gaps.some((gap) => gap.reason.includes("Conflicting"))).toBe(true);
    db.ingest({ ...event, id: `${event.cluster}:unrelated:0`, signature: "unrelated", toOwner: event.fromOwner });
    expect(db.snapshot().metrics.ignored).toBe(1);
  });

  it("rejects mixed clusters, invalid identities and more than five watched wallets", () => {
    const db = store();
    expect(() => db.ingest({ ...eventAt(0), id: "wrong" })).toThrow(/identity/);
    const e = eventAt(0);
    expect(() => db.ingest({ ...e, cluster: "devnet", id: `devnet:${e.signature}:0` })).toThrow(/cluster/);
    expect(() => store(":memory:", { wallets: Array(6).fill(DEMO_WALLETS[0]) })).toThrow(/1–5/);
    expect(db.snapshot().metrics.received).toBe(0);
  });

  it("does not use replay recovery as evidence of live stream continuity", () => {
    const db = store(":memory:", { source: { ...config.source, origin: "chain", mode: "live" } });
    expect(() => db.recoverReplay()).toThrow(/live-chain/);
  });

  it("binds persisted data to source and watch configuration", () => {
    const dir = mkdtempSync(join(tmpdir(), "doppel-monitor-")); dirs.push(dir);
    const path = join(dir, "monitor.sqlite"); store(path).close();
    expect(() => store(path, { datasetId: "different" })).toThrow(/different source/);
  });

  it("serves a read-only labelled snapshot without a public write route", async () => {
    const db = store(); const server = monitorServer(db);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const address = server.address(); if (!address || typeof address === "string") throw new Error("no address");
      const url = `http://127.0.0.1:${address.port}/snapshot`;
      const response = await fetch(url);
      expect(MonitorSnapshotSchema.parse(await response.json()).source.mode).toBe("replay");
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect((await fetch(url, { method: "POST", body: "{}" })).status).toBe(404);
    } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
  });
});
