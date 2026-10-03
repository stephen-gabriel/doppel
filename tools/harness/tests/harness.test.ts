import { afterEach, describe, expect, it, vi } from "vitest";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import type { Draft } from "@doppel/engine";
import {
  assertDevnetEndpoint,
  assertDevnetOnly,
  assertObservedDevnetGenesis,
  buildSolTransfer,
  canRequestWalletSignature,
  generateDisposableKey,
  mutateTransferDestination,
  submitSignedTransaction,
} from "../src/index.ts";

const SENDER = "5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc";
const REAL = "4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY";
const SPOOF = "4yfuQCL4fnNfSbBgqFcPTFn5GGZABDaEFQLhGpwjizcY";
const BLOCKHASH = "11111111111111111111111111111111";

const draft: Draft = {
  cluster: "devnet",
  sender: SENDER,
  recipientId: "r1",
  recipientRevision: 1,
  destination: REAL,
  asset: "SOL",
  amountRaw: "1000",
};

const identity = {
  endpoint: "https://api.devnet.solana.com",
  genesisHash: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
  observed: true,
};

describe("harness guards", () => {
  afterEach(() => vi.restoreAllMocks());
  it("rejects non-devnet endpoints and observed wrong genesis at the raw broadcast boundary", async () => {
    const tx = buildSolTransfer(draft, BLOCKHASH);
    const send = vi.spyOn(Connection.prototype, "sendRawTransaction").mockResolvedValue("not-allowed");
    const genesis = vi.spyOn(Connection.prototype, "getGenesisHash").mockResolvedValue("mainnet");
    await expect(submitSignedTransaction(new Connection("https://api.mainnet-beta.solana.com"), tx, "devnet")).rejects.toThrow(/endpoint/);
    expect(genesis).not.toHaveBeenCalled();
    await expect(submitSignedTransaction(new Connection("https://api.devnet.solana.com"), tx, "devnet")).rejects.toThrow(/genesis/);
    expect(send).not.toHaveBeenCalled();
  });
  it("rejects nonpositive, oversized amounts and non-SOL drafts in the SOL builder", () => {
    for (const amountRaw of ["0", "-1", "1.2", "100000001"]) {
      expect(() => buildSolTransfer({ ...draft, amountRaw }, BLOCKHASH)).toThrow();
    }
    expect(() => buildSolTransfer({ ...draft, asset: "USDC" }, BLOCKHASH)).toThrow(/non-SOL/);
  });
  it("refuses mainnet cluster, mainnet endpoints, and unobserved genesis", () => {
    expect(() => assertDevnetOnly("mainnet-beta")).toThrow(/non-devnet/);
    expect(() => assertDevnetEndpoint("https://api.mainnet-beta.solana.com")).toThrow(/non-devnet RPC/);
    expect(() =>
      assertObservedDevnetGenesis({
        endpoint: "https://api.devnet.solana.com",
        genesisHash: identity.genesisHash,
        observed: false,
      }),
    ).toThrow(/unobserved/);
  });

  it("does not request a signature for a mismatch or mutated compiled transaction", () => {
    const tx = buildSolTransfer(draft, BLOCKHASH);
    const mismatch = canRequestWalletSignature({
      cluster: "devnet",
      identity,
      draft: { ...draft, destination: SPOOF },
      transaction: tx,
      policyAllows: true,
    });
    expect(mismatch.ok).toBe(false);

    const mutated = mutateTransferDestination(tx, SPOOF);
    const changed = canRequestWalletSignature({
      cluster: "devnet",
      identity,
      draft,
      transaction: mutated,
      policyAllows: true,
    });
    expect(changed.ok).toBe(false);
    expect(changed.reasonCodes).toContain("inspect.destination_mismatch");
  });

  it("never exposes a mainnet send path even if policy is ready", () => {
    const result = canRequestWalletSignature({
      cluster: "mainnet-beta",
      identity,
      draft: { ...draft, cluster: "mainnet-beta" },
      transaction: buildSolTransfer(draft, BLOCKHASH),
      policyAllows: true,
    });
    expect(result.ok).toBe(false);
    expect(result.reasonCodes).toContain("mainnet_send_forbidden");
  });

  it("generates an Ed25519 keypair whose public key matches the secret", () => {
    const key = generateDisposableKey();
    expect(key.secretKey.length).toBe(64);
    const restored = Keypair.fromSecretKey(key.secretKey);
    expect(restored.publicKey.toBase58()).toBe(key.publicKey);
    expect(new PublicKey(key.publicKey).toBytes().length).toBe(32);
  });
});
