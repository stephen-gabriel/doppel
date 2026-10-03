import { PublicKey, type Connection, type Transaction } from "@solana/web3.js";
import type { Draft } from "@doppel/engine";
import { formatRawAmount } from "./amounts";

/** Read-only preflight; never changes the requested amount or creates an account. */
export async function checkDevnetFunding(connection: Connection, draft: Draft, transaction: Transaction): Promise<string> {
  if (draft.cluster !== "devnet") throw new Error("Funding check is for test-network payments only.");
  const sender = new PublicKey(draft.sender);
  const destination = new PublicKey(draft.destination);
  if (sender.equals(destination)) throw new Error("Use a different receiving address for this test payment.");
  const [balance, fee, recipient] = await Promise.all([
    connection.getBalance(sender, "confirmed"),
    connection.getFeeForMessage(transaction.compileMessage(), "confirmed"),
    draft.asset === "SOL" ? connection.getAccountInfo(destination, "confirmed") : Promise.resolve(null),
  ]);
  if (fee.value === null || !Number.isSafeInteger(fee.value) || !Number.isSafeInteger(balance)) {
    throw new Error("Could not estimate the test-network fee. Check again before sending.");
  }
  if (draft.asset === "SOL" && recipient === null) {
    const minimum = await connection.getMinimumBalanceForRentExemption(0, "confirmed");
    if (!Number.isSafeInteger(minimum)) throw new Error("Could not determine the receiving account's minimum funding.");
    if (BigInt(draft.amountRaw) < BigInt(minimum)) {
      throw new Error(`This receiving address is new on devnet. Send at least ${formatRawAmount(String(minimum), 9)} test SOL to fund it. The receiver does not need to add funds first. Change the amount and check again.`);
    }
  }
  const needed = BigInt(fee.value) + (draft.asset === "SOL" ? BigInt(draft.amountRaw) : 0n);
  if (BigInt(balance) < needed) {
    throw new Error(`Your sending wallet has ${formatRawAmount(String(balance), 9)} test SOL and needs at least ${formatRawAmount(needed.toString(), 9)} test SOL${draft.asset === "SOL" ? " for the amount and network fee" : " for the network fee"}. Fund the sending wallet from a free devnet faucet; do not buy or use real SOL.`);
  }
  return `Sending wallet funding checked. Estimated network fee: ${formatRawAmount(String(fee.value), 9)} test SOL.`;
}
