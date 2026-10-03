import { describe, expect, it, vi } from "vitest";
import { Connection, Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import type { Draft } from "@doppel/engine";
import { formatRawAmount, parseDisplayAmount } from "../src/lib/amounts.ts";
import { checkDevnetFunding } from "../src/lib/funding.ts";

describe("human-readable amounts", () => {
  it("converts exact decimal text to raw units without floating point", () => {
    expect(parseDisplayAmount("0.001", 9)).toBe("1000000");
    expect(parseDisplayAmount("0.10", 6)).toBe("100000");
    expect(parseDisplayAmount("1.000000001", 9)).toBe("1000000001");
    expect(formatRawAmount("1000000001", 9)).toBe("1.000000001");
    expect(formatRawAmount("100000", 6)).toBe("0.1");
  });
  it("rejects invalid, zero, exponent, over-precision and overflowing amounts instead of rounding", () => {
    for (const value of ["", "0", "-1", "1e-3", "1,000", "0.0000000001", "18446744074"]) {
      expect(parseDisplayAmount(value, 9)).toBeNull();
    }
    expect(parseDisplayAmount("0.0000001", 6)).toBeNull();
  });
});

function setup(amountRaw = "1000000") {
  const sender = Keypair.generate().publicKey;
  const receiver = Keypair.generate().publicKey;
  const draft: Draft = { cluster: "devnet", sender: sender.toBase58(), destination: receiver.toBase58(),
    recipientId: "r", recipientRevision: 1, asset: "SOL", amountRaw };
  const connection = new Connection("https://api.devnet.solana.com");
  const balance = vi.spyOn(connection, "getBalance").mockResolvedValue(10_000_000);
  vi.spyOn(connection, "getFeeForMessage").mockResolvedValue({ context: { slot: 1 }, value: 5000 });
  vi.spyOn(connection, "getAccountInfo").mockResolvedValue(null);
  vi.spyOn(connection, "getMinimumBalanceForRentExemption").mockResolvedValue(890880);
  const tx = new Transaction({ feePayer: sender, recentBlockhash: receiver.toBase58() }).add(
    SystemProgram.transfer({ fromPubkey: sender, toPubkey: receiver, lamports: BigInt(amountRaw) }));
  return { draft, connection, balance, tx };
}
describe("test-payment funding guidance", () => {
  it("allows a funded sender to transfer to a recipient with no account", async () => {
    const f = setup();
    await expect(checkDevnetFunding(f.connection, f.draft, f.tx)).resolves.toContain("0.000005 test SOL");
  });
  it("explains minimum funding for a new receiver without changing the amount", async () => {
    const f = setup("1000");
    await expect(checkDevnetFunding(f.connection, f.draft, f.tx)).rejects.toThrow("at least 0.00089088 test SOL");
    expect(f.draft.amountRaw).toBe("1000");
  });
  it("identifies the sending wallet that needs faucet funds", async () => {
    const f = setup(); f.balance.mockResolvedValue(0);
    await expect(checkDevnetFunding(f.connection, f.draft, f.tx)).rejects.toThrow("Your sending wallet has 0 test SOL and needs at least 0.001005 test SOL");
  });
});
