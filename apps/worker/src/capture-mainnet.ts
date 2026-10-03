import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { poisoningHistoryAssets } from "@doppel/engine";
import { clusterEndpoint, RpcChainReader } from "@doppel/sources";
import { MonitorStore } from "./store.ts";

// Real mainnet capture: reads actual chain state through the same reader the app uses,
// then persists it through the real monitor store so the exported snapshot is genuine.
// Usage: node --experimental-strip-types src/capture-mainnet.ts <wallet> <output.json> [maxTx]
const [wallet, output, maxTxRaw] = process.argv.slice(2);
if (!wallet || !output) throw new Error("Supply a wallet address and output snapshot path.");

const cluster = "mainnet-beta" as const;
const maxTransactions = Number(maxTxRaw ?? 25);
if (!Number.isInteger(maxTransactions) || maxTransactions < 1 || maxTransactions > 200) {
  throw new Error("maxTx must be an integer 1-200.");
}

// Public mainnet RPC rate-limits aggressively; back off on 429 so a real capture is not
// silently truncated by throttling. Capture-only retry; app reads stay fail-fast.
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const retryingFetch: typeof fetch = async (input, init) => {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(input, init);
    if (response.status !== 429 || attempt >= 5) return response;
    await sleep(Math.min(8000, 500 * 2 ** attempt));
  }
};

const startedAt = Date.now();
const reader = new RpcChainReader({
  endpoint: clusterEndpoint(cluster), provider: "public-rpc", rpsLimit: 3, fetchImpl: retryingFetch,
});

const windowHours = 720;
const { events, coverage } = await reader.readHistory({
  cluster, wallet, assets: poisoningHistoryAssets(cluster), maxTransactions,
});

const failed = coverage.warnings.filter((warning) => warning.includes("failed:")).length;
console.log(`events=${events.length} fetched=${coverage.fetchedTransactionCount} failedFetches=${failed}`);
console.log(`coverage=${coverage.status} lastSlot=${coverage.lastEvaluatedSlot ?? "unknown"}`);
if (coverage.status === "unavailable") {
  throw new Error(`Mainnet history unavailable: ${coverage.warnings.join(" ")}`);
}

const directory = mkdtempSync(join(tmpdir(), "doppel-capture-"));
const store = new MonitorStore(join(directory, "capture.sqlite"), {
  wallets: [wallet],
  // Honest provenance: real chain origin, captured now, not a live subscription.
  source: { cluster, origin: "chain", mode: "historical", provider: "public-rpc" },
  datasetId: `mainnet-capture-${wallet.slice(0, 8)}-${startedAt}`,
  maxEvents: 2000,
  windowHours,
});

for (const event of events) store.ingest(event);
store.transition("completed");

const snapshot = store.snapshot();
snapshot.warnings = [
  `Captured from live mainnet public RPC at ${new Date(startedAt).toISOString()}; last observed slot ${snapshot.metrics.lastSlot ?? "unknown"}.`,
  ...(failed > 0
    ? [`${failed} transaction fetches were rate-limited by the public endpoint and are absent from this capture; coverage is partial.`]
    : []),
  ...snapshot.warnings,
];

if (snapshot.metrics.retained === 0) {
  throw new Error("No retained transfers; refusing to emit an empty capture.");
}

writeFileSync(output, JSON.stringify(snapshot, null, 2) + "\n", { flag: "wx" });
store.close();
console.log(`retained=${snapshot.metrics.retained} findings=${snapshot.findings.length}`);
console.log(`wrote ${output}`);
