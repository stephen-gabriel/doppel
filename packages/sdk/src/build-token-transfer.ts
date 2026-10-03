import { PublicKey, Transaction, type Connection } from "@solana/web3.js";
import { createTransferCheckedInstruction, getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { resolveAsset, type Draft } from "@doppel/engine";
import type { TokenAccountFact } from "./inspect.ts";

// Existing canonical token accounts only; account creation is a separate future workflow.
export async function buildDevnetTokenTransfer(connection: Connection, draft: Draft, blockhash: string) {
  if (draft.cluster !== "devnet" || resolveAsset(draft.cluster, draft.asset).kind !== "canonical_usdc") {
    throw new Error("Unsupported devnet token transfer.");
  }
  if (!/^\d+$/.test(draft.amountRaw) || BigInt(draft.amountRaw) <= 0n || BigInt(draft.amountRaw) > 1_000_000n) {
    throw new Error("Devnet token amount must be positive and at most 1 test USDC.");
  }
  const mint = new PublicKey(draft.asset);
  const sender = new PublicKey(draft.sender);
  const destination = new PublicKey(draft.destination);
  const sourceAta = await getAssociatedTokenAddress(mint, sender);
  const destinationAta = await getAssociatedTokenAddress(mint, destination, true);
  const [source, target] = await Promise.all([
    getAccount(connection, sourceAta, "confirmed", TOKEN_PROGRAM_ID),
    getAccount(connection, destinationAta, "confirmed", TOKEN_PROGRAM_ID),
  ]);
  if (!source.isInitialized || !target.isInitialized || source.isFrozen || target.isFrozen) {
    throw new Error("Token account is uninitialized or frozen.");
  }
  if (source.amount < BigInt(draft.amountRaw)) throw new Error("Insufficient devnet USDC balance.");
  const fact = (account: typeof source): TokenAccountFact => ({
    address: account.address.toBase58(), mint: account.mint.toBase58(), owner: account.owner.toBase58(),
  });
  const transaction = new Transaction({ feePayer: sender, recentBlockhash: blockhash }).add(
    createTransferCheckedInstruction(sourceAta, mint, destinationAta, sender, BigInt(draft.amountRaw), 6),
  );
  return { transaction, sourceTokenAccount: fact(source), destinationTokenAccount: fact(target) };
}
