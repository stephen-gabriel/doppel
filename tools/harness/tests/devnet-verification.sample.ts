// Explicitly invoked live check, excluded from the unit suite. No secret is printed/persisted.
import { Connection, Keypair } from "@solana/web3.js";
import { RpcChainReader } from "@doppel/sources";
import { CheckCoordinator } from "@doppel/sdk";
import { poisoningHistoryAssets, type Draft, type RecipientRecord } from "@doppel/engine";
import { assertObservedDevnetGenesis, buildSolTransfer, canRequestWalletSignature,
  fetchRpcGenesis, requestAirdrop, submitSignedTransaction } from "../src/index.ts";

const endpoint = "https://api.devnet.solana.com";
const key = Keypair.generate();
const recipientKey = Keypair.generate();
const record: Record<string, unknown> = {
  recordedAt: new Date().toISOString(), endpoint, cluster: "devnet", costUsd: 0,
  sender: key.publicKey.toBase58(), destination: recipientKey.publicKey.toBase58(),
  confirmed: false, signature: null,
};
try {
  const identity = await fetchRpcGenesis(endpoint);
  assertObservedDevnetGenesis(identity);
  record.identity = identity;
  const connection = new Connection(endpoint, { commitment: "confirmed", disableRetryOnRateLimit: true,
    fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(20_000) }) });
  const faucet = await requestAirdrop(endpoint, key.publicKey.toBase58(), 10_000_000);
  record.faucet = faucet;
  if (!faucet.ok || !faucet.signature) throw new Error(faucet.error ?? "faucet_unavailable");
  // Bounded balance polling; never repeat a funded write to compensate for a slow response.
  let balance = 0;
  for (let attempt = 0; attempt < 6; attempt++) {
    balance = await connection.getBalance(key.publicKey, "confirmed");
    if (balance >= 1_010_000) break;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  record.balanceLamports = balance;
  if (balance < 1_010_000) throw new Error("airdrop_not_yet_available");
  const now = Date.now();
  const recipient: RecipientRecord = { id: "controlled-devnet-recipient", cluster: "devnet",
    address: recipientKey.publicKey.toBase58(), label: "Controlled test recipient", confirmationStatus: "confirmed",
    confirmationMethod: "harness_owned_key", confirmedAt: now, revision: 1, createdAt: now, updatedAt: now, addressHistory: [] };
  const draft: Draft = { cluster: "devnet", sender: key.publicKey.toBase58(), recipientId: recipient.id,
    recipientRevision: 1, destination: recipient.address, asset: "SOL", amountRaw: "1000000" };
  const reader = new RpcChainReader({ endpoint, provider: "public-devnet", rpsLimit: 2 });
  const coordinator = new CheckCoordinator(async ({ draft: value, signal }) => reader.readHistory({
    cluster: "devnet", wallet: value.sender, assets: poisoningHistoryAssets("devnet"), maxTransactions: 10,
  }, signal));
  const initial = await coordinator.run(draft, recipient);
  record.coverage = initial.bound?.coverage;
  if (initial.combined.reasonCodes.includes("policy.history_acknowledgment_required")) {
    record.acknowledgedLimitedHistory = coordinator.acknowledgeHistoryLimit(draft, recipient);
  }
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const tx = buildSolTransfer(draft, blockhash);
  const gate = canRequestWalletSignature({ cluster: "devnet", identity, draft, transaction: tx,
    policyAllows: coordinator.allowsWalletRequest(draft, recipient) });
  record.gate = gate;
  if (!gate.ok) throw new Error("policy_or_transaction_blocked");
  // Prove destination substitution cannot reuse this inspected transaction before the sole send.
  record.mutatedDestinationBlocked = !canRequestWalletSignature({ cluster: "devnet", identity,
    draft: { ...draft, destination: Keypair.generate().publicKey.toBase58() }, transaction: tx, policyAllows: true }).ok;
  tx.sign(key);
  const signature = await submitSignedTransaction(connection, tx, "devnet",
    async () => coordinator.allowsWalletRequest(draft, recipient));
  record.signature = signature;
  const confirmation = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
  record.confirmation = confirmation;
  record.confirmed = confirmation.value.err === null;
} catch (error) {
  record.blocker = error instanceof Error ? error.message : String(error);
}
console.log(JSON.stringify(record, null, 2));
