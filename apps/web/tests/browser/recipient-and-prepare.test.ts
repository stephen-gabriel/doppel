import { afterEach, describe, expect, it, vi } from "vitest";
import { ComputeBudgetProgram, Connection, Keypair, Message, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { assertUnchangedWalletMessage, connectWallet, requestWalletSignature, walletAvailability, type WalletRequest } from "../../src/lib/wallet.ts";

// In-process provider/transport tests. Real IndexedDB + page behavior live in Playwright.
function setup() {
  const key = Keypair.generate();
  const recipient = Keypair.generate();
  const transaction = new Transaction({ feePayer: key.publicKey, recentBlockhash: Keypair.generate().publicKey.toBase58() })
    .add(SystemProgram.transfer({ fromPubkey: key.publicKey, toPubkey: recipient.publicKey, lamports: 1000 }));
  const sign = vi.fn(async (tx: Transaction) => { tx.partialSign(key); return tx; });
  vi.stubGlobal("window", { solana: { publicKey: key.publicKey,
    connect: vi.fn(async () => ({ publicKey: key.publicKey })), signTransaction: sign } });
  const genesis = vi.spyOn(Connection.prototype, "getGenesisHash").mockResolvedValue("EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG");
  const send = vi.spyOn(Connection.prototype, "sendRawTransaction").mockResolvedValue("test-signature");
  const fee = vi.spyOn(Connection.prototype, "getFeeForMessage").mockResolvedValue({ context: { slot: 1 }, value: 5020 });
  const balance = vi.spyOn(Connection.prototype, "getBalance").mockResolvedValue(10_000_000);
  vi.spyOn(Connection.prototype, "confirmTransaction").mockResolvedValue({ context: { slot: 1 }, value: { err: null } });
  const request: WalletRequest = { transaction, cluster: "devnet", sender: key.publicKey.toBase58(),
    lastValidBlockHeight: 100, revalidate: vi.fn(async () => true) };
  return { key, transaction, request, sign, send, genesis, fee, balance };
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("sign-only wallet and explicit devnet broadcast boundary", () => {
  it("reports missing providers immediately with an actionable error", async () => {
    vi.stubGlobal("window", {});
    expect(walletAvailability().available).toBe(false);
    await expect(connectWallet()).rejects.toThrow(/Install Phantom or Solflare/);
  });

  it("accepts a wallet that returns a reconstructed transaction from wire bytes", async () => {
    const { request, sign, key, send } = setup();
    sign.mockImplementation(async (tx) => {
      const copy = Transaction.from(Uint8Array.from(tx.serialize({ requireAllSignatures: false })));
      copy.partialSign(key);
      return Transaction.from(Uint8Array.from(copy.serialize()));
    });
    await expect(requestWalletSignature(request)).resolves.toBe("test-signature");
    expect(send).toHaveBeenCalledOnce();
  });

  it("accepts equivalent account-index ordering while rejecting changed account privileges", () => {
    const sender = Keypair.generate().publicKey;
    const destination = Keypair.generate().publicKey;
    const tx = new Transaction({ feePayer: sender, recentBlockhash: destination.toBase58() })
      .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }))
      .add(SystemProgram.transfer({ fromPubkey: sender, toPubkey: destination, lamports: 1000 }));
    const original = tx.compileMessage();
    const order = [0, 1, 3, 2]; // Swap two readonly program accounts only.
    const reordered = new Message({ header: { ...original.header },
      accountKeys: order.map((index) => original.accountKeys[index]!), recentBlockhash: original.recentBlockhash,
      instructions: original.instructions.map((ix) => ({ ...ix, programIdIndex: order.indexOf(ix.programIdIndex),
        accounts: ix.accounts.map((index) => order.indexOf(index)) })) });
    expect(original.serialize().equals(reordered.serialize())).toBe(false);
    expect(() => assertUnchangedWalletMessage(original.serialize(), reordered.serialize())).not.toThrow();
    reordered.header.numReadonlyUnsignedAccounts = 1;
    expect(() => assertUnchangedWalletMessage(original.serialize(), reordered.serialize())).toThrow(/permissions changed/);
  });

  it("rejects a price without an explicit limit and blockhash replacement", async () => {
    const { request, sign, key, send } = setup();
    sign.mockImplementation(async (tx) => {
      tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100 }));
      tx.partialSign(key); return tx;
    });
    await expect(requestWalletSignature(request)).rejects.toThrow(/no explicit compute-unit limit/);
    expect(send).not.toHaveBeenCalled();
    sign.mockImplementation(async (tx) => {
      tx.recentBlockhash = Keypair.generate().publicKey.toBase58();
      tx.partialSign(key); return tx;
    });
    await expect(requestWalletSignature(request)).rejects.toThrow(/recent blockhash changed/);
    expect(send).not.toHaveBeenCalled();
  });

  it("accepts Phantom-style limit and price additions, verifies final fee and broadcasts their signed bytes", async () => {
    const { request, sign, key, send, fee } = setup();
    const onFeeChecked = vi.fn();
    sign.mockImplementation(async (tx) => {
      tx.instructions.unshift(ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100 }));
      tx.partialSign(key); return Transaction.from(tx.serialize());
    });
    await expect(requestWalletSignature({ ...request, onFeeChecked })).resolves.toBe("test-signature");
    expect(fee).toHaveBeenCalledOnce();
    const signed = Transaction.from(send.mock.calls[0]![0]);
    expect(signed.instructions).toHaveLength(3);
    expect(signed.verifySignatures()).toBe(true);
    expect(onFeeChecked).toHaveBeenCalledWith(expect.stringContaining("0.00000502 test SOL"));
  });

  it("rejects excessive priority fees before querying the network fee", async () => {
    const { request, sign, key, send, fee } = setup();
    sign.mockImplementation(async (tx) => {
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500001 })); // ceil = 100001 lamports
      tx.partialSign(key); return tx;
    });
    await expect(requestWalletSignature(request)).rejects.toThrow(/above Doppel's/);
    expect(send).not.toHaveBeenCalled(); expect(fee).not.toHaveBeenCalled();
  });

  it("rejects total fee overflow and insufficient balance after allowed wallet additions", async () => {
    const { request, sign, key, send, fee, balance } = setup();
    sign.mockImplementation(async (tx) => {
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100 }));
      tx.partialSign(key); return tx;
    });
    fee.mockResolvedValue({ context: { slot: 1 }, value: 120001 });
    await expect(requestWalletSignature(request)).rejects.toThrow(/exceeds 0.00012/);
    fee.mockResolvedValue({ context: { slot: 1 }, value: 5020 }); balance.mockResolvedValue(6000);
    await expect(requestWalletSignature(request)).rejects.toThrow(/needs more devnet SOL/);
    expect(send).not.toHaveBeenCalled();
  });

  it("does not hide changed payments behind valid compute-budget instructions", async () => {
    const { request, sign, key, send } = setup();
    sign.mockImplementation(async (tx) => {
      tx.instructions[0] = SystemProgram.transfer({ fromPubkey: key.publicKey,
        toPubkey: Keypair.generate().publicKey, lamports: 1000 });
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100 }));
      tx.partialSign(key); return tx;
    });
    await expect(requestWalletSignature(request)).rejects.toThrow(/changed transaction/);
    expect(send).not.toHaveBeenCalled();
  });

  it("accepts the reported 75000-lamport Phantom priority fee and checks total funding", async () => {
    const { request, sign, key, send, fee, balance } = setup();
    const onFeeChecked = vi.fn();
    sign.mockImplementation(async (tx) => {
      tx.instructions.unshift(ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 375000 }));
      tx.partialSign(key); return Transaction.from(tx.serialize());
    });
    fee.mockResolvedValue({ context: { slot: 1 }, value: 80000 });
    await expect(requestWalletSignature({ ...request, onFeeChecked })).resolves.toBe("test-signature");
    expect(onFeeChecked).toHaveBeenCalledWith(expect.stringContaining("including 0.000075 test SOL priority fee"));
    expect(send).toHaveBeenCalledOnce();
    send.mockClear(); balance.mockResolvedValue(80999); // 1000 transfer + 80000 fee needed.
    await expect(requestWalletSignature(request)).rejects.toThrow(/needs more devnet SOL/);
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects duplicate, unsupported, account-bearing and malformed budget instructions", () => {
    const { transaction } = setup();
    const before = transaction.serializeMessage();
    const cases = [
      [ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }), ComputeBudgetProgram.setComputeUnitLimit({ units: 100000 })],
      [ComputeBudgetProgram.requestHeapFrame({ bytes: 32768 })],
      [ComputeBudgetProgram.setComputeUnitLimit({ units: 1400001 })],
      [new TransactionInstruction({ programId: ComputeBudgetProgram.programId, keys: [], data: Buffer.from([3, 1]) })],
      [new TransactionInstruction({ programId: ComputeBudgetProgram.programId,
        keys: [{ pubkey: transaction.feePayer!, isSigner: false, isWritable: false }],
        data: ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }).data })],
    ];
    for (const extras of cases) {
      const copy = Transaction.from(transaction.serialize({ requireAllSignatures: false }));
      copy.add(...extras);
      expect(() => assertUnchangedWalletMessage(before, copy.serializeMessage())).toThrow();
    }
  });
  it("connects, signs actual bytes, verifies the signature and confirms on devnet", async () => {
    const { key, request, sign, send } = setup();
    expect(await connectWallet()).toBe(key.publicKey.toBase58());
    expect(await requestWalletSignature(request)).toBe("test-signature");
    expect(sign).toHaveBeenCalledOnce();
    const raw = send.mock.calls[0]?.[0];
    expect(raw).toBeDefined();
    expect(Transaction.from(raw!).verifySignatures()).toBe(true);
    expect(send.mock.instances[0]?.rpcEndpoint).toBe("https://api.devnet.solana.com");
  });

  it("never asks a wallet to sign mainnet", async () => {
    const { request, sign, send } = setup();
    await expect(requestWalletSignature({ ...request, cluster: "mainnet-beta" })).rejects.toThrow("mainnet_send_forbidden");
    expect(sign).not.toHaveBeenCalled(); expect(send).not.toHaveBeenCalled();
  });

  it("rejects an observed non-devnet genesis", async () => {
    const { request, genesis, sign } = setup();
    genesis.mockResolvedValue("mainnet-genesis");
    await expect(requestWalletSignature(request)).rejects.toThrow(/genesis/);
    expect(sign).not.toHaveBeenCalled();
  });

  it("rejects a connected wallet differing from the checked sender", async () => {
    const { request, sign } = setup();
    await expect(requestWalletSignature({ ...request, sender: Keypair.generate().publicKey.toBase58() })).rejects.toThrow(/does not match/);
    expect(sign).not.toHaveBeenCalled();
  });

  it("does not broadcast if the draft changes during wallet approval", async () => {
    const { request, send } = setup();
    request.revalidate = vi.fn().mockResolvedValueOnce(true).mockResolvedValue(false);
    await expect(requestWalletSignature(request)).rejects.toThrow(/while signing/);
    expect(send).not.toHaveBeenCalled();
  });

  it("checks again after the final network identity request", async () => {
    const { request, send } = setup();
    request.revalidate = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValue(false);
    await expect(requestWalletSignature(request)).rejects.toThrow(/before broadcast/);
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects wallet mutation of signed transaction bytes", async () => {
    const { request, sign, send, key } = setup();
    sign.mockImplementation(async (tx) => {
      tx.add(SystemProgram.transfer({ fromPubkey: key.publicKey, toPubkey: Keypair.generate().publicKey, lamports: 1 }));
      tx.partialSign(key); return tx;
    });
    await expect(requestWalletSignature(request)).rejects.toThrow(/changed transaction/);
    expect(send).not.toHaveBeenCalled();
  });
});
