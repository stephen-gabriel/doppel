import { DatabaseSync } from "node:sqlite";
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";
import { evaluatePattern, isSupportedCheckAsset, isValidAddress, MonitorSnapshotSchema,
  poisoningHistoryAssets, RULE_VERSION, TransferEventSchema, type TransferEvent, type MonitorSnapshot } from "@doppel/engine";

export type MonitorConfig = {
  wallets: string[];
  source: MonitorSnapshot["source"];
  datasetId: string;
  maxEvents: number;
  windowHours: number;
};
type Row = { payload: string };
type State = {
  sessionId: string; startedAt: number; heartbeatAt: number; state: MonitorSnapshot["state"];
  cursor: number; received: number; duplicates: number; ignored: number; evicted: number;
  reconnects: number; restarts: number; lastSlot: number | null; processingSamples: number; processingTotalMs: number;
};

export class MonitorStore {
  private readonly db: DatabaseSync;
  private readonly config: MonitorConfig;
  private state: State;
  private readonly now: () => number;
  constructor(path: string, config: MonitorConfig, now: () => number = Date.now) {
    this.now = now;
    if (config.wallets.length < 1 || config.wallets.length > 5 ||
      new Set(config.wallets).size !== config.wallets.length || config.wallets.some((wallet) => !isValidAddress(wallet))) {
      throw new Error("Configure 1–5 unique, valid public wallet addresses.");
    }
    if (!Number.isInteger(config.maxEvents) || config.maxEvents < 2 || config.maxEvents > 5000 ||
      !Number.isFinite(config.windowHours) || config.windowHours <= 0 || config.windowHours > 720) {
      throw new Error("Monitor retention must be 2–5000 events and 0–720 hours.");
    }
    this.config = structuredClone(config);
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;
      CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, slot INTEGER NOT NULL, event_time INTEGER, payload TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS events_slot ON events(slot);
      CREATE TABLE IF NOT EXISTS findings (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS gaps (id INTEGER PRIMARY KEY, reason TEXT NOT NULL, openedAt INTEGER NOT NULL, recoveredAt INTEGER);`);
    const identity = JSON.stringify({ ...config, wallets: [...config.wallets].sort(), ruleVersion: RULE_VERSION });
    const stored = this.db.prepare("SELECT payload FROM metadata WHERE key='config'").get() as Row | undefined;
    if (stored && stored.payload !== identity) { this.db.close(); throw new Error("Database belongs to a different source/watch set/rule configuration. Use a separate database."); }
    this.db.prepare("INSERT OR IGNORE INTO metadata VALUES ('config', ?)").run(identity);
    const previous = this.db.prepare("SELECT payload FROM metadata WHERE key='state'").get() as Row | undefined;
    this.state = previous ? JSON.parse(previous.payload) as State : {
      sessionId: randomUUID(), startedAt: now(), heartbeatAt: now(), state: "backfilling", cursor: 0,
      received: 0, duplicates: 0, ignored: 0, evicted: 0, reconnects: 0, restarts: 0, lastSlot: null,
      processingSamples: 0, processingTotalMs: 0,
    };
    if (previous) {
      this.state.restarts++; this.state.sessionId = randomUUID(); this.state.startedAt = now();
      this.state.state = "backfilling";
      this.openGap("Worker restarted; resume/backfill not yet verified.");
    }
    this.save();
  }

  get cursor(): number { return this.state.cursor; }

  private save(): void {
    this.state.heartbeatAt = this.now();
    this.db.prepare("INSERT OR REPLACE INTO metadata VALUES ('state', ?)").run(JSON.stringify(this.state));
  }

  private atomic(fn: () => void): void {
    const previous = structuredClone(this.state);
    this.db.exec("BEGIN IMMEDIATE");
    try { fn(); this.save(); this.db.exec("COMMIT"); }
    catch (error) { this.db.exec("ROLLBACK"); this.state = previous; throw error; }
  }

  private openGap(reason: string): void {
    const existing = this.db.prepare("SELECT id FROM gaps WHERE reason=? AND recoveredAt IS NULL").get(reason);
    if (!existing) this.db.prepare("INSERT INTO gaps(reason, openedAt) VALUES (?, ?)").run(reason, this.now());
    // Keep the audit bounded without silently discarding open gaps.
    this.db.exec("DELETE FROM gaps WHERE recoveredAt IS NOT NULL AND id NOT IN (SELECT id FROM gaps ORDER BY id DESC LIMIT 40)");
  }

  private events(): TransferEvent[] {
    return (this.db.prepare("SELECT payload FROM events ORDER BY slot, id").all() as Row[])
      .map((row) => TransferEventSchema.parse(JSON.parse(row.payload)));
  }

  ingest(value: TransferEvent, cursor?: number): void {
    const started = performance.now();
    const event = TransferEventSchema.parse(value);
    if (event.id !== `${event.cluster}:${event.signature}:${event.instructionPath}`) throw new Error("Event identity must include cluster, signature and instruction path.");
    if (event.cluster !== this.config.source.cluster) throw new Error("Event cluster does not match monitor source.");
    this.atomic(() => {
      this.state.received++;
      const relevant = this.config.wallets.some((wallet) => event.fromOwner === wallet || event.toOwner === wallet);
      if (!relevant || !isSupportedCheckAsset(event.cluster, event.asset)) this.state.ignored++;
      else {
        const existing = this.db.prepare("SELECT payload FROM events WHERE id=?").get(event.id) as Row | undefined;
        if (existing) {
          const old = JSON.parse(existing.payload) as TransferEvent;
          if (JSON.stringify({ ...old, observedAt: 0 }) !== JSON.stringify({ ...event, observedAt: 0 })) {
            this.openGap("Conflicting payload for a previously stored event; provider reconciliation required.");
          } else this.state.duplicates++;
        } else {
          this.db.prepare("INSERT INTO events VALUES (?, ?, ?, ?)").run(event.id, event.slot, event.blockTime, JSON.stringify(event));
          this.state.lastSlot = Math.max(this.state.lastSlot ?? 0, event.slot);
          if (event.resolution !== "resolved") this.openGap("Unresolved supported transfer; ownership/decoding coverage incomplete.");
          this.evict();
          this.recompute();
        }
      }
      if (cursor !== undefined) this.state.cursor = cursor;
      this.state.processingSamples++;
      this.state.processingTotalMs += Math.max(0, performance.now() - started);
    });
  }

  private evict(): void {
    // Replay retention follows event time, not today's wall clock.
    const latest = this.db.prepare("SELECT MAX(event_time) AS time FROM events").get() as { time: number | null };
    let deleted = 0;
    if (latest.time !== null) deleted += Number(this.db.prepare("DELETE FROM events WHERE event_time < ?")
      .run(latest.time - this.config.windowHours * 3600000).changes);
    deleted += Number(this.db.prepare("DELETE FROM events WHERE id NOT IN (SELECT id FROM events ORDER BY slot DESC, id DESC LIMIT ?)")
      .run(this.config.maxEvents).changes);
    if (deleted) { this.state.evicted += deleted; this.openGap("Retention limit removed history; earlier relationships may be missing."); }
  }

  private recompute(): void {
    const events = this.events();
    const priorFindings = new Map((this.db.prepare("SELECT id, payload FROM findings").all() as Array<Row & { id: string }>)
      .map((row) => [row.id, (JSON.parse(row.payload) as { detectedAt: number }).detectedAt]));
    this.db.exec("DELETE FROM findings");
    let count = 0;
    // Re-evaluate the bounded cohort when late events arrive; no arrival-order inference.
    for (const wallet of this.config.wallets) {
      const history = events.filter((event) => event.fromOwner === wallet || event.toOwner === wallet);
      const destinations = [...new Set(history.filter((event) => event.toOwner === wallet && event.fromOwner !== wallet)
        .map((event) => event.fromOwner).filter((value): value is string => value !== null))];
      for (const destination of destinations) {
        const result = evaluatePattern({ sender: wallet, destination, events: history, coverage: "partial", now: this.now() });
        if (result.pattern !== "suspected_poisoning") continue;
        const ids = new Set(result.evidence.filter((fact) => fact.code === "pattern.sequence").flatMap((fact) => fact.eventIds));
        const evidence = history.filter((event) => ids.has(event.id)).slice(0, 20);
        const id = `${wallet}:${destination}`;
        const finding = { id, wallet, destination, label: "suspected_poisoning",
          ruleVersion: RULE_VERSION, detectedAt: priorFindings.get(id) ?? this.now(), evidence };
        if (count++ < 100) this.db.prepare("INSERT INTO findings VALUES (?, ?)").run(finding.id, JSON.stringify(finding));
      }
    }
    if (count > 100) this.openGap("Finding display limit reached; only the first 100 retained findings are shown.");
  }

  transition(state: MonitorSnapshot["state"], cursor?: number): void {
    this.atomic(() => {
      this.state.state = state;
      if (cursor !== undefined) this.state.cursor = cursor;
      if (state === "disconnected") { this.state.reconnects++; this.openGap("Source disconnected; recovery not yet verified."); }
    });
  }

  recoverReplay(cursor?: number): void {
    if (this.config.source.mode !== "replay") throw new Error("Replay recovery cannot establish live-chain continuity.");
    this.atomic(() => {
      this.db.prepare("UPDATE gaps SET recoveredAt=? WHERE recoveredAt IS NULL AND reason IN (?, ?)")
        .run(this.now(), "Source disconnected; recovery not yet verified.", "Worker restarted; resume/backfill not yet verified.");
      this.state.state = "running";
      if (cursor !== undefined) this.state.cursor = cursor;
    });
  }

  heartbeat(): void { this.save(); }

  snapshot(): MonitorSnapshot {
    const retained = (this.db.prepare("SELECT COUNT(*) AS count FROM events").get() as { count: number }).count;
    return MonitorSnapshotSchema.parse({ version: 1, sessionId: this.state.sessionId, source: this.config.source,
      state: this.state.state, startedAt: this.state.startedAt, heartbeatAt: this.state.heartbeatAt,
      watchCount: this.config.wallets.length, assets: poisoningHistoryAssets(this.config.source.cluster),
      historyWindowHours: this.config.windowHours, coverage: "partial",
      warnings: ["Only the configured wallets and retained supported transfers are evaluated; no network-wide coverage.",
        this.config.source.mode === "replay" ? "Replay is not a live chain subscription. Findings are test observations, not new attacks." : "Historical coverage and stream recovery must be independently verified."],
      metrics: { received: this.state.received, retained, duplicates: this.state.duplicates, ignored: this.state.ignored,
        evicted: this.state.evicted, reconnects: this.state.reconnects, restarts: this.state.restarts,
        lastSlot: this.state.lastSlot, cursor: this.state.cursor, processingSamples: this.state.processingSamples,
        processingMeanMs: this.state.processingSamples ? this.state.processingTotalMs / this.state.processingSamples : 0 },
      gaps: this.db.prepare("SELECT id, reason, openedAt, recoveredAt FROM gaps ORDER BY id DESC LIMIT 50").all(),
      findings: (this.db.prepare("SELECT payload FROM findings ORDER BY id LIMIT 100").all() as Row[]).map((row) => JSON.parse(row.payload)),
    });
  }

  close(): void { this.db.close(); }
}
