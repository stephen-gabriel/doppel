import { describe, expect, it } from "vitest";
import { ComputeBudgetProgram, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { createTransferCheckedInstruction, createTransferInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { MAINNET_USDC_MINT, type Draft } from "@doppel/engine";
import { inspectCompiledTransaction, TOKEN_PROGRAM } from "../src/inspect.ts";

const SENDER = "5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc";
const REAL = "4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY";
const SPOOF = "4yfuQCL4fnNfSbBgqFcPTFn5GGZABDaEFQLhGpwjizcY";
const SRC = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const DST = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

const draft: Draft = {
  cluster: "devnet",
  sender: SENDER,
  recipientId: "r1",
  recipientRevision: 1,
  destination: REAL,
  asset: "SOL",
  amountRaw: "1000",
};

function solTx(destination: string, amount = 1000n): Transaction {
  const tx = new Transaction();
  tx.feePayer = new PublicKey(SENDER);
  tx.recentBlockhash = "11111111111111111111111111111111";
  tx.add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(SENDER),
      toPubkey: new PublicKey(destination),
      lamports: Number(amount),
    }),
  );
  return tx;
}

describe("inspectCompiledTransaction", () => {
  it("rejects extra account creation and priority-fee instructions", () => {
    const tx = solTx(REAL);
    tx.add(SystemProgram.createAccount({ fromPubkey: new PublicKey(SENDER), newAccountPubkey: Keypair.generate().publicKey,
      lamports: 10000, space: 0, programId: SystemProgram.programId }));
    expect(inspectCompiledTransaction(draft, tx).reasonCodes).toContain("inspect.unsupported_instruction");
    const fee = solTx(REAL).add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000_000 }));
    expect(inspectCompiledTransaction(draft, fee).ok).toBe(false);
  });

  it("rejects zero amounts, missing signer flags and unsupported assets", () => {
    expect(inspectCompiledTransaction({ ...draft, amountRaw: "0" }, solTx(REAL, 0n)).ok).toBe(false);
    const tx = solTx(REAL);
    tx.instructions[0]!.keys[0]!.isSigner = false;
    expect(inspectCompiledTransaction(draft, tx).ok).toBe(false);
    expect(inspectCompiledTransaction({ ...draft, asset: "unknown" }, solTx(REAL)).ok).toBe(false);
  });
  it("accepts a matching SOL transfer", () => {
    expect(inspectCompiledTransaction(draft, solTx(REAL)).ok).toBe(true);
  });

  it("rejects a mutated destination even if the form still shows the original", () => {
    const result = inspectCompiledTransaction(draft, solTx(SPOOF));
    expect(result.ok).toBe(false);
    expect(result.reasonCodes).toContain("inspect.destination_mismatch");
  });

  it("requires independently verified token-account mint and owner", () => {
    const usdcDraft: Draft = { ...draft, asset: MAINNET_USDC_MINT, cluster: "mainnet-beta", amountRaw: "5" };
    const tx = new Transaction();
    tx.feePayer = new PublicKey(SENDER);
    tx.recentBlockhash = "11111111111111111111111111111111";
    tx.add(
      createTransferCheckedInstruction(
        new PublicKey(SRC),
        new PublicKey(MAINNET_USDC_MINT),
        new PublicKey(DST),
        new PublicKey(SENDER),
        5,
        6,
      ),
    );
    expect(inspectCompiledTransaction(usdcDraft, tx).reasonCodes).toContain(
      "inspect.destination_token_unverified",
    );
    expect(
      inspectCompiledTransaction(usdcDraft, tx, {
        destinationTokenAccount: { address: DST, mint: MAINNET_USDC_MINT, owner: SPOOF },
      }).reasonCodes,
    ).toContain("inspect.destination_owner_mismatch");
    expect(TOKEN_PROGRAM).toBe(TOKEN_PROGRAM_ID.toBase58());
    const sourceTokenAccount = { address: SRC, mint: MAINNET_USDC_MINT, owner: SENDER };
    const destinationTokenAccount = { address: DST, mint: MAINNET_USDC_MINT, owner: REAL };
    expect(inspectCompiledTransaction(usdcDraft, tx, { sourceTokenAccount, destinationTokenAccount }).ok).toBe(true);
    expect(inspectCompiledTransaction(usdcDraft, tx, {
      sourceTokenAccount: { ...sourceTokenAccount, owner: SPOOF }, destinationTokenAccount,
    }).ok).toBe(false);
    const plain = new Transaction({ feePayer: new PublicKey(SENDER), recentBlockhash: REAL }).add(
      createTransferInstruction(new PublicKey(SRC), new PublicKey(DST), new PublicKey(SENDER), 5),
    );
    expect(inspectCompiledTransaction(usdcDraft, plain, { destinationTokenAccount }).ok).toBe(false);
    expect(inspectCompiledTransaction(usdcDraft, plain, { sourceTokenAccount, destinationTokenAccount }).ok).toBe(true);
    tx.instructions[0]!.data[9] = 9;
    expect(inspectCompiledTransaction(usdcDraft, tx, { sourceTokenAccount, destinationTokenAccount }).ok).toBe(false);
  });

  it("rejects a second unexpected transfer", () => {
    const tx = solTx(REAL);
    tx.add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(SENDER),
        toPubkey: new PublicKey(REAL),
        lamports: 1,
      }),
    );
    expect(inspectCompiledTransaction(draft, tx).reasonCodes).toContain("inspect.expected_one_transfer");
  });
});
