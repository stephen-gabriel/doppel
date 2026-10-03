import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  type Connection,
} from "@solana/web3.js";
import { inspectCompiledTransaction, type TokenAccountFact } from "@doppel/sdk";
import type { Draft } from "@doppel/engine";
import {
  assertDevnetEndpoint,
  assertDevnetOnly,
  assertObservedDevnetGenesis,
  type RpcIdentity,
} from "./cluster.ts";

export const MAX_HARNESS_LAMPORTS = 100_000_000n;

export function capLamports(amountRaw: string): bigint {
  if (!/^\d+$/.test(amountRaw)) throw new Error("Invalid transfer amount.");
  const value = BigInt(amountRaw);
  if (value <= 0n || value > MAX_HARNESS_LAMPORTS) {
    throw new Error("Harness transfer exceeds cap.");
  }
  return value;
}

export function buildSolTransfer(draft: Draft, recentBlockhash: string): Transaction {
  assertDevnetOnly(draft.cluster);
  if (draft.asset !== "SOL") throw new Error("SOL builder refuses non-SOL assets.");
  const lamports = capLamports(draft.amountRaw);
  const tx = new Transaction();
  tx.feePayer = new PublicKey(draft.sender);
  tx.recentBlockhash = recentBlockhash;
  tx.add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(draft.sender),
      toPubkey: new PublicKey(draft.destination),
      lamports: Number(lamports),
    }),
  );
  return tx;
}

export function mutateTransferDestination(tx: Transaction, nextDestination: string): Transaction {
  const copy = Transaction.from(tx.serialize({ requireAllSignatures: false, verifySignatures: false }));
  const ix = copy.instructions[0];
  if (!ix || !ix.programId.equals(SystemProgram.programId) || !ix.keys[1]) {
    throw new Error("expected system transfer");
  }
  ix.keys[1] = { ...ix.keys[1], pubkey: new PublicKey(nextDestination) };
  return copy;
}

export function canRequestWalletSignature(input: {
  cluster: Draft["cluster"];
  identity: RpcIdentity;
  draft: Draft;
  transaction: Transaction;
  policyAllows: boolean;
  destinationTokenAccount?: TokenAccountFact | null;
  sourceTokenAccount?: TokenAccountFact | null;
}): { ok: boolean; reasonCodes: string[] } {
  const reasons: string[] = [];
  try {
    assertDevnetOnly(input.cluster);
    assertObservedDevnetGenesis(input.identity);
  } catch (error) {
    reasons.push(error instanceof Error ? error.message : "cluster_guard");
  }
  if (input.draft.cluster === "mainnet-beta" || input.cluster === "mainnet-beta") {
    reasons.push("mainnet_send_forbidden");
  }
  if (!input.policyAllows) {
    reasons.push("policy_forbids_signature");
  }
  if (input.cluster !== input.draft.cluster) reasons.push("cluster_mismatch");
  const inspected = inspectCompiledTransaction(input.draft, input.transaction, {
    destinationTokenAccount: input.destinationTokenAccount ?? null,
    sourceTokenAccount: input.sourceTokenAccount ?? null,
  });
  if (!inspected.ok) {
    reasons.push(...inspected.reasonCodes);
  }
  return { ok: reasons.length === 0, reasonCodes: reasons };
}

export async function submitSignedTransaction(
  connection: Connection,
  signed: Transaction,
  cluster: Draft["cluster"] | "local-test",
  beforeSubmit?: () => Promise<boolean>,
): Promise<string> {
  assertDevnetOnly(cluster);
  assertDevnetEndpoint(connection.rpcEndpoint);
  assertObservedDevnetGenesis({ endpoint: connection.rpcEndpoint,
    genesisHash: await connection.getGenesisHash(), observed: true });
  if (beforeSubmit && !(await beforeSubmit())) throw new Error("Payment changed before broadcast.");
  const raw = signed.serialize();
  return connection.sendRawTransaction(raw, { skipPreflight: false });
}

export function extraComputeBudgetIx(): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey("ComputeBudget111111111111111111111111111111"),
    keys: [],
    data: Buffer.from([2, 32, 161, 7, 0]),
  });
}

export { assertDevnetEndpoint };
