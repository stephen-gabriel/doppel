import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEMO_DATASET_ID, DEMO_STEPS, DEMO_WALLETS } from "./demo.ts";
import { MonitorStore } from "./store.ts";
import { ReplayRunner } from "./replay.ts";
import { monitorServer } from "./server.ts";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const mode = process.env.MONITOR_MODE ?? "replay";
if (mode !== "replay") throw new Error("Only explicit synthetic replay is implemented. Live Solami requires G1 and a verified adapter; no automatic fallback.");
if (process.env.WATCH_WALLETS?.trim()) throw new Error("The bundled replay uses its own labelled synthetic cohort. Custom watchlists require a live adapter.");
const path = resolve(root, process.env.WORKER_DB_PATH || "worker-data/synthetic-monitor.sqlite");
const port = Number(process.env.MONITOR_PORT ?? 4318);
const intervalMs = Number(process.env.REPLAY_INTERVAL_MS ?? 1000);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("MONITOR_PORT must be 1024–65535.");
mkdirSync(dirname(path), { recursive: true });
const store = new MonitorStore(path, { wallets: DEMO_WALLETS,
  source: { cluster: "mainnet-beta", origin: "synthetic", mode: "replay", provider: "local synthetic replay" },
  datasetId: DEMO_DATASET_ID, maxEvents: 1000, windowHours: 48 });
const runner = new ReplayRunner(store, DEMO_STEPS, intervalMs);
const server = monitorServer(store);
let stopping = false;
let playback: Promise<void> | null = null;
let heartbeat: ReturnType<typeof setInterval> | null = null;
async function stop() {
  if (stopping) return;
  stopping = true; runner.stop();
  if (heartbeat) clearInterval(heartbeat);
  await playback;
  await new Promise<void>((done) => server.close(() => done()));
  store.transition("stopped"); store.close();
}
server.on("error", (error) => { console.error(error.message); void stop(); process.exitCode = 1; });
server.listen(port, "127.0.0.1", () => {
  console.log(`Synthetic replay only — NOT live mainnet. Snapshot: http://127.0.0.1:${port}/snapshot`);
  console.log(`SQLite: ${path}; resuming cursor ${store.cursor}/${DEMO_STEPS.length}`);
  heartbeat = setInterval(() => store.heartbeat(), 10_000);
  playback = runner.run().then(() => {
    console.log(JSON.stringify(store.snapshot(), null, 2));
    if (process.argv.includes("--once")) void stop();
    else console.log("Replay completed. Snapshot server remains available; Ctrl+C stops it. Restart resumes without duplicating events.");
  }).catch((error: unknown) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
});
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
