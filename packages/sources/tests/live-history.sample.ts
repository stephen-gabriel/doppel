import { writeFileSync } from "node:fs";
import { MAINNET_USDC_MINT } from "@doppel/engine";
import { RpcChainReader } from "../src/chain-reader.ts";

const wallet = process.argv[2] ?? "5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc";
const reader = new RpcChainReader({
  endpoint: process.env.PUBLIC_RPC_URL ?? "https://api.mainnet-beta.solana.com",
  provider: "public-rpc",
  rpsLimit: 2,
});

const started = Date.now();
const first = await reader.readHistory({
  cluster: "mainnet-beta",
  wallet,
  assets: ["SOL", MAINNET_USDC_MINT],
  maxTransactions: 8,
});
const coldMs = Date.now() - started;
const secondStarted = Date.now();
const second = await reader.readHistory({
  cluster: "mainnet-beta",
  wallet,
  assets: ["SOL", MAINNET_USDC_MINT],
  maxTransactions: 8,
});
const warmMs = Date.now() - secondStarted;

const summary = {
  wallet,
  provider: "public-rpc",
  coldMs,
  warmMs,
  firstStatus: first.coverage.status,
  secondStatus: second.coverage.status,
  fetched: first.coverage.fetchedTransactionCount,
  events: first.events.length,
  unsupported: first.coverage.unsupportedEventCount,
  unresolved: first.coverage.unresolvedEventCount,
  warnings: first.coverage.warnings,
  sample: first.events.slice(0, 3).map((event) => ({
    id: event.id,
    asset: event.asset,
    resolution: event.resolution,
    blockTime: event.blockTime,
    fromOwner: event.fromOwner,
    toOwner: event.toOwner,
  })),
};

writeFileSync("fixtures/g3-live-sample.json", `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
