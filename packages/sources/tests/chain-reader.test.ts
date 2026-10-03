import { describe, expect, it } from "vitest";
import { MAINNET_USDC_MINT } from "@doppel/engine";
import { RpcChainReader } from "../src/chain-reader.ts";
import { SYSTEM_PROGRAM, TOKEN_PROGRAM } from "../src/programs.ts";

const WALLET = "5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc";
const OTHER = "4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY";
const TOKEN_ACCOUNT = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

function rpcResult(result: unknown) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), {
    headers: { "content-type": "application/json" },
  });
}

describe("RpcChainReader", () => {
  it("merges owner and token-account signatures, skips failed txs, and reports the cap", async () => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { method: string; params: unknown[] };
      calls.push(body.method);
      if (body.method === "getTokenAccountsByOwner") {
        return rpcResult({ value: [{ pubkey: TOKEN_ACCOUNT }] });
      }
      if (body.method === "getSignaturesForAddress") {
        const address = body.params[0];
        if (address === WALLET) {
          return rpcResult([
            { signature: "sig-sol", slot: 20, err: null, blockTime: 100 },
            { signature: "sig-fail", slot: 19, err: { InstructionError: [0, "Custom"] }, blockTime: 90 },
          ]);
        }
        return rpcResult([{ signature: "sig-usdc", slot: 18, err: null, blockTime: 80 }]);
      }
      if (body.method === "getTransaction") {
        const signature = body.params[0];
        if (signature === "sig-fail") {
          return rpcResult({
            slot: 19,
            blockTime: 90,
            meta: { err: { InstructionError: [0, "Custom"] } },
            transaction: { signatures: [signature], message: { accountKeys: [], instructions: [] } },
          });
        }
        if (signature === "sig-sol") {
          return rpcResult({
            slot: 20,
            blockTime: 100,
            meta: { err: null },
            transaction: {
              signatures: [signature],
              message: {
                accountKeys: [WALLET, OTHER, SYSTEM_PROGRAM],
                instructions: [
                  {
                    programId: SYSTEM_PROGRAM,
                    parsed: { type: "transfer", info: { source: WALLET, destination: OTHER, lamports: "42" } },
                  },
                ],
              },
            },
          });
        }
        return rpcResult({
          slot: 18,
          blockTime: 80,
          meta: {
            err: null,
            postTokenBalances: [
              { accountIndex: 0, mint: MAINNET_USDC_MINT, owner: OTHER, uiTokenAmount: { decimals: 6 } },
              { accountIndex: 1, mint: MAINNET_USDC_MINT, owner: WALLET, uiTokenAmount: { decimals: 6 } },
            ],
          },
          transaction: {
            signatures: [signature],
            message: {
              accountKeys: [TOKEN_ACCOUNT, "4yfuQCL4fnNfSbBgqFcPTFn5GGZABDaEFQLhGpwjizcY"],
              instructions: [
                {
                  programId: TOKEN_PROGRAM,
                  parsed: {
                    type: "transfer",
                    info: {
                      source: TOKEN_ACCOUNT,
                      destination: "4yfuQCL4fnNfSbBgqFcPTFn5GGZABDaEFQLhGpwjizcY",
                      amount: "10",
                      mint: MAINNET_USDC_MINT,
                    },
                  },
                },
              ],
            },
          },
        });
      }
      throw new Error(`unexpected ${body.method}`);
    };

    const reader = new RpcChainReader({
      endpoint: "https://example.invalid",
      provider: "mock",
      rpsLimit: 100,
      fetchImpl,
      now: () => 1_000,
    });
    const result = await reader.readHistory({
      cluster: "mainnet-beta",
      wallet: WALLET,
      assets: ["SOL", MAINNET_USDC_MINT],
      maxTransactions: 3,
    });

    expect(result.coverage.tokenAccountDiscovery).toBe("partial");
    expect(result.coverage.status).toBe("partial");
    expect(result.events.some((event) => event.asset === "SOL")).toBe(true);
    expect(result.events.some((event) => event.asset === MAINNET_USDC_MINT)).toBe(true);
    expect(result.events.every((event) => event.resolution !== "resolved" || event.fromOwner !== null)).toBe(true);
    expect(calls).toContain("getTokenAccountsByOwner");

    const capped = await reader.readHistory({
      cluster: "mainnet-beta",
      wallet: WALLET,
      assets: ["SOL"],
      maxTransactions: 1,
    });
    expect(capped.coverage.limitReason).toBe("transaction_cap");
    expect(capped.coverage.status).toBe("partial");
  });

  it("returns unavailable coverage on RPC failure without pretending history is empty", async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error("network down");
    };
    const reader = new RpcChainReader({
      endpoint: "https://example.invalid",
      provider: "mock",
      fetchImpl,
      now: () => 1,
    });
    const result = await reader.readHistory({
      cluster: "mainnet-beta",
      wallet: WALLET,
      assets: ["SOL"],
      maxTransactions: 10,
    });
    expect(result.coverage.status).toBe("unavailable");
    expect(result.events).toEqual([]);
    expect(result.coverage.warnings.some((item) => item.includes("Signature listing failed"))).toBe(true);
  });
});
