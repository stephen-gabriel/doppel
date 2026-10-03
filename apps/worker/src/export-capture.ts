import { readFileSync, writeFileSync } from "node:fs";
import { MonitorSnapshotSchema } from "@doppel/engine";

// Explicit operator export of a verified saved snapshot; no secrets in this schema.
// Usage: node --experimental-strip-types src/export-capture.ts input.json output.json
const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("Supply input snapshot JSON and output bundle path.");
const raw = readFileSync(input, "utf8");
if (Buffer.byteLength(raw) > 2_000_000) throw new Error("Snapshot exceeds 2 MB.");
const snapshot = MonitorSnapshotSchema.parse(JSON.parse(raw));
if (snapshot.source.origin !== "chain" || snapshot.source.cluster !== "mainnet-beta" || snapshot.source.mode === "replay") {
  throw new Error("Only actual mainnet chain observations may be exported as a hosted historical capture. Synthetic/replay data refused.");
}
if (snapshot.metrics.retained === 0) throw new Error("No retained transfers to capture.");
const bundle = { version: 1, capturedAt: Date.now(), snapshot: {
  ...snapshot, state: "stopped", source: { ...snapshot.source, mode: "historical" },
}, note: "Operator-exported historical mainnet snapshot. Inspect provenance and source before publishing; not current activity." };
writeFileSync(output, JSON.stringify(bundle, null, 2) + "\n", { flag: "wx" });
console.log(`Exported ${snapshot.metrics.retained} retained observations. Review and replace the app's empty monitor-capture.json bundle before redeploying.`);
