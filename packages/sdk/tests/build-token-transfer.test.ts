import { afterEach, describe, expect, it, vi } from "vitest";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AccountLayout, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { DEVNET_CIRCLE_USDC_MINT, type Draft } from "@doppel/engine";
import { buildDevnetTokenTransfer } from "../src/build-token-transfer.ts";
import { inspectCompiledTransaction } from "../src/inspect.ts";

function fixture() {
  const sender = Keypair.generate().publicKey;
  const recipient = Keypair.generate().publicKey;
  const mint = new PublicKey(DEVNET_CIRCLE_USDC_MINT);
  const source = getAssociatedTokenAddressSync(mint, sender);
  const connection = new Connection("https://api.devnet.solana.com");
  const lookup = vi.spyOn(connection, "getAccountInfo").mockImplementation(async (address) => {
    const data = Buffer.alloc(AccountLayout.span);
    AccountLayout.encode({ mint, owner: address.equals(source) ? sender : recipient,
      amount: 1000000n, delegateOption: 0, delegate: PublicKey.default, state: 1,
      isNativeOption: 0, isNative: 0n, delegatedAmount: 0n, closeAuthorityOption: 0,
      closeAuthority: PublicKey.default }, data);
    return { data, owner: TOKEN_PROGRAM_ID, executable: false, lamports: 2039280 };
  });
  const draft: Draft = { cluster: "devnet", sender: sender.toBase58(), destination: recipient.toBase58(),
    recipientId: "test", recipientRevision: 1, asset: DEVNET_CIRCLE_USDC_MINT, amountRaw: "1000" };
  return { connection, draft, lookup };
}
afterEach(() => vi.restoreAllMocks());
describe("devnet existing-account USDC builder", () => {
  it("decodes real token-account layouts and builds a strictly inspectable transfer", async () => {
    const { connection, draft } = fixture();
    const result = await buildDevnetTokenTransfer(connection, draft, Keypair.generate().publicKey.toBase58());
    expect(inspectCompiledTransaction(draft, result.transaction, result).ok).toBe(true);
    expect(result.transaction.instructions).toHaveLength(1);
  });
  it("refuses missing token accounts and never creates them implicitly", async () => {
    const { connection, draft, lookup } = fixture();
    lookup.mockResolvedValue(null);
    await expect(buildDevnetTokenTransfer(connection, draft, Keypair.generate().publicKey.toBase58())).rejects.toThrow();
  });
  it("refuses mainnet and oversized token amounts before any account reads", async () => {
    const { connection, draft, lookup } = fixture();
    await expect(buildDevnetTokenTransfer(connection, { ...draft, cluster: "mainnet-beta" }, "unused")).rejects.toThrow();
    await expect(buildDevnetTokenTransfer(connection, { ...draft, amountRaw: "1000001" }, "unused")).rejects.toThrow();
    expect(lookup).not.toHaveBeenCalled();
  });
});
