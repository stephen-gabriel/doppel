import { describe, expect, it } from "vitest";
import { MAINNET_USDC_MINT } from "@doppel/engine";
import { parseSupportedTransfers } from "../src/parse.ts";
import { SYSTEM_PROGRAM, TOKEN_PROGRAM } from "../src/programs.ts";
import type { ParsedTransaction } from "../src/rpc.ts";

const SENDER = "5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc";
const REAL = "4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY";
const DELEGATE = "DxoTroNJeuqHNmxKKjue4TQcTMeHySLTm7t4vq1jRKzr";
const TOKEN_SRC = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_DST = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

function solTransfer(err: unknown = null): ParsedTransaction {
  return {
    slot: 10,
    blockTime: 1_700_000_000,
    meta: { err },
    transaction: {
      signatures: ["sig-sol"],
      message: {
        accountKeys: [SENDER, REAL, SYSTEM_PROGRAM],
        instructions: [
          {
            program: "system",
            programId: SYSTEM_PROGRAM,
            parsed: {
              type: "transfer",
              info: { source: SENDER, destination: REAL, lamports: "1000" },
            },
          },
        ],
      },
    },
  };
}

describe("parseSupportedTransfers", () => {
  it("parses a successful SOL transfer and ignores failed transactions", () => {
    const ok = parseSupportedTransfers({
      cluster: "mainnet-beta",
      signature: "sig-sol",
      observedAt: 5,
      transaction: solTransfer(),
    });
    expect(ok[0]?.resolution).toBe("resolved");
    const failed = parseSupportedTransfers({
      cluster: "mainnet-beta",
      signature: "sig-fail",
      observedAt: 5,
      transaction: solTransfer({ InstructionError: [0, "Custom"] }),
    });
    expect(failed).toEqual([]);
  });

  it("parses transferChecked amount from info.tokenAmount.amount", () => {
    const tx: ParsedTransaction = {
      slot: 12,
      blockTime: 1_700_000_100,
      meta: {
        err: null,
        preTokenBalances: [
          { accountIndex: 0, mint: MAINNET_USDC_MINT, owner: REAL, uiTokenAmount: { decimals: 6, amount: "25000" } },
        ],
        postTokenBalances: [
          { accountIndex: 1, mint: MAINNET_USDC_MINT, owner: SENDER, uiTokenAmount: { decimals: 6, amount: "25000" } },
        ],
      },
      transaction: {
        signatures: ["sig-checked"],
        message: {
          accountKeys: [TOKEN_SRC, TOKEN_DST, TOKEN_PROGRAM],
          instructions: [
            {
              programId: TOKEN_PROGRAM,
              parsed: {
                type: "transferChecked",
                info: {
                  source: TOKEN_SRC,
                  destination: TOKEN_DST,
                  mint: MAINNET_USDC_MINT,
                  tokenAmount: { amount: "25000", decimals: 6, uiAmount: 0.025, uiAmountString: "0.025" },
                  authority: DELEGATE,
                },
              },
            },
          ],
        },
      },
    };
    const events = parseSupportedTransfers({
      cluster: "mainnet-beta",
      signature: "sig-checked",
      observedAt: 9,
      transaction: tx,
    });
    expect(events[0]?.amountRaw).toBe("25000");
    expect(events[0]?.fromOwner).toBe(REAL);
    expect(events[0]?.toOwner).toBe(SENDER);
    expect(events[0]?.resolution).toBe("resolved");
  });

  it("does not treat a delegate authority as the token-account owner", () => {
    const tx: ParsedTransaction = {
      slot: 13,
      blockTime: 10,
      meta: {
        err: null,
        preTokenBalances: [
          { accountIndex: 0, mint: MAINNET_USDC_MINT, owner: REAL, uiTokenAmount: { decimals: 6, amount: "5" } },
        ],
        postTokenBalances: [
          { accountIndex: 1, mint: MAINNET_USDC_MINT, owner: SENDER, uiTokenAmount: { decimals: 6, amount: "5" } },
        ],
      },
      transaction: {
        signatures: ["sig-delegate"],
        message: {
          accountKeys: [TOKEN_SRC, TOKEN_DST],
          instructions: [
            {
              programId: TOKEN_PROGRAM,
              parsed: {
                type: "transfer",
                info: { source: TOKEN_SRC, destination: TOKEN_DST, amount: "5", authority: DELEGATE, mint: MAINNET_USDC_MINT },
              },
            },
          ],
        },
      },
    };
    const events = parseSupportedTransfers({
      cluster: "mainnet-beta",
      signature: "sig-delegate",
      observedAt: 1,
      transaction: tx,
    });
    expect(events[0]?.fromOwner).toBe(REAL);
    expect(events[0]?.fromOwner).not.toBe(DELEGATE);
  });

  it("leaves closed or owner-changed token accounts unresolved", () => {
    const closed: ParsedTransaction = {
      slot: 14,
      blockTime: 11,
      meta: { err: null, preTokenBalances: [], postTokenBalances: [] },
      transaction: {
        signatures: ["sig-closed"],
        message: {
          accountKeys: [TOKEN_SRC, TOKEN_DST],
          instructions: [
            {
              programId: TOKEN_PROGRAM,
              parsed: {
                type: "transferChecked",
                info: {
                  source: TOKEN_SRC,
                  destination: TOKEN_DST,
                  mint: MAINNET_USDC_MINT,
                  tokenAmount: { amount: "1" },
                  authority: DELEGATE,
                },
              },
            },
          ],
        },
      },
    };
    const closedEvents = parseSupportedTransfers({
      cluster: "mainnet-beta",
      signature: "sig-closed",
      observedAt: 1,
      transaction: closed,
    });
    expect(closedEvents[0]?.resolution).toBe("unresolved");
    expect(closedEvents[0]?.fromOwner).toBeNull();

    const changed: ParsedTransaction = {
      slot: 15,
      blockTime: 12,
      meta: {
        err: null,
        preTokenBalances: [
          { accountIndex: 0, mint: MAINNET_USDC_MINT, owner: REAL, uiTokenAmount: { decimals: 6, amount: "1" } },
        ],
        postTokenBalances: [
          { accountIndex: 0, mint: MAINNET_USDC_MINT, owner: SENDER, uiTokenAmount: { decimals: 6, amount: "0" } },
          { accountIndex: 1, mint: MAINNET_USDC_MINT, owner: SENDER, uiTokenAmount: { decimals: 6, amount: "1" } },
        ],
      },
      transaction: {
        signatures: ["sig-changed"],
        message: {
          accountKeys: [TOKEN_SRC, TOKEN_DST],
          instructions: [
            {
              programId: TOKEN_PROGRAM,
              parsed: {
                type: "transfer",
                info: { source: TOKEN_SRC, destination: TOKEN_DST, amount: "1", mint: MAINNET_USDC_MINT, authority: DELEGATE },
              },
            },
          ],
        },
      },
    };
    const changedEvents = parseSupportedTransfers({
      cluster: "mainnet-beta",
      signature: "sig-changed",
      observedAt: 1,
      transaction: changed,
    });
    expect(changedEvents[0]?.resolution).toBe("unresolved");
  });
});
