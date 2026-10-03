import { writeFileSync } from "node:fs";
import {
  assertDevnetEndpoint,
  generateDisposableKey,
  tryFreeFaucets,
} from "../src/index.ts";

const endpoint = process.env.DEVNET_RPC_URL ?? "https://api.devnet.solana.com";
assertDevnetEndpoint(endpoint);
const key = generateDisposableKey();
const result = await tryFreeFaucets(key.publicKey, 1_000_000);
const record = {
  endpoint,
  publicKey: key.publicKey,
  ok: result.ok,
  signature: result.signature ?? null,
  error: result.error ?? null,
};
writeFileSync("fixtures/g5-devnet-faucet.json", `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify(record, null, 2));
