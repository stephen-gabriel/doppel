import type { Cluster, TransferEvent } from "@doppel/engine";
import { NATIVE_SOL_ASSET, resolveAsset } from "@doppel/engine";
import { SYSTEM_PROGRAM, isTokenProgram } from "./programs.ts";
import type { ParsedInstruction, ParsedTransaction, TokenBalance } from "./rpc.ts";

function accountKey(value: string | { pubkey: string }): string {
  return typeof value === "string" ? value : value.pubkey;
}

function instructionProgramId(instruction: ParsedInstruction): string | null {
  if (instruction.programId) {
    return instruction.programId;
  }
  if (typeof instruction.program === "string" && instruction.program === "system") {
    return SYSTEM_PROGRAM;
  }
  return null;
}

function stringField(info: Record<string, unknown> | undefined, key: string): string | null {
  const value = info?.[key];
  return typeof value === "string" ? value : null;
}

function integerAmount(value: unknown): string | null {
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return value;
  }
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return String(value);
  }
  return null;
}

function tokenTransferAmount(info: Record<string, unknown> | undefined): string | null {
  if (!info) {
    return null;
  }
  const nested = info.tokenAmount;
  if (nested && typeof nested === "object") {
    const amount = integerAmount((nested as { amount?: unknown }).amount);
    if (amount) {
      return amount;
    }
  }
  return integerAmount(info.amount) ?? integerAmount(info.tokenAmount);
}

function tokenAccountOwner(
  accountIndex: number,
  pre: TokenBalance[] | undefined,
  post: TokenBalance[] | undefined,
): { owner: string | null; ambiguous: boolean } {
  if (accountIndex < 0) {
    return { owner: null, ambiguous: true };
  }
  const preOwner = pre?.find((item) => item.accountIndex === accountIndex)?.owner ?? null;
  const postOwner = post?.find((item) => item.accountIndex === accountIndex)?.owner ?? null;
  if (preOwner && postOwner && preOwner !== postOwner) {
    return { owner: null, ambiguous: true };
  }
  if (preOwner) {
    return { owner: preOwner, ambiguous: false };
  }
  if (postOwner) {
    return { owner: postOwner, ambiguous: false };
  }
  return { owner: null, ambiguous: true };
}

function mintFromBalances(
  balances: TokenBalance[] | undefined,
  accountIndex: number,
): { mint: string; decimals: number | null } | null {
  const match = balances?.find((item) => item.accountIndex === accountIndex);
  if (!match) {
    return null;
  }
  return {
    mint: match.mint,
    decimals: match.uiTokenAmount?.decimals ?? null,
  };
}

function accountIndexOf(accountKeys: string[], address: string | null): number {
  if (address === null) {
    return -1;
  }
  return accountKeys.indexOf(address);
}

export function parseSupportedTransfers(input: {
  cluster: Cluster;
  signature: string;
  observedAt: number;
  transaction: ParsedTransaction;
}): TransferEvent[] {
  if (input.transaction.meta?.err) {
    return [];
  }
  const accountKeys = input.transaction.transaction.message.accountKeys.map(accountKey);
  const loaded = input.transaction.meta?.loadedAddresses;
  if (loaded?.writable) {
    accountKeys.push(...loaded.writable);
  }
  if (loaded?.readonly) {
    accountKeys.push(...loaded.readonly);
  }

  const pre = input.transaction.meta?.preTokenBalances;
  const post = input.transaction.meta?.postTokenBalances;
  const events: TransferEvent[] = [];
  const outer = input.transaction.transaction.message.instructions ?? [];
  outer.forEach((instruction, outerIndex) => {
    const parsed = parseInstruction({
      cluster: input.cluster,
      signature: input.signature,
      observedAt: input.observedAt,
      slot: input.transaction.slot,
      blockTime: input.transaction.blockTime,
      instruction,
      path: String(outerIndex),
      accountKeys,
      pre,
      post,
    });
    if (parsed) {
      events.push(parsed);
    }
  });

  for (const inner of input.transaction.meta?.innerInstructions ?? []) {
    inner.instructions.forEach((instruction, innerIndex) => {
      const parsed = parseInstruction({
        cluster: input.cluster,
        signature: input.signature,
        observedAt: input.observedAt,
        slot: input.transaction.slot,
        blockTime: input.transaction.blockTime,
        instruction,
        path: `${inner.index}.${innerIndex}`,
        accountKeys,
        pre,
        post,
      });
      if (parsed) {
        events.push(parsed);
      }
    });
  }

  return events;
}

function parseInstruction(input: {
  cluster: Cluster;
  signature: string;
  observedAt: number;
  slot: number;
  blockTime: number | null;
  instruction: ParsedInstruction;
  path: string;
  accountKeys: string[];
  pre: TokenBalance[] | undefined;
  post: TokenBalance[] | undefined;
}): TransferEvent | null {
  const programId = instructionProgramId(input.instruction);
  const info = input.instruction.parsed?.info;
  const type = input.instruction.parsed?.type;
  const id = `${input.cluster}:${input.signature}:${input.path}`;
  const blockTimeMs = input.blockTime === null ? null : input.blockTime * 1000;

  if (programId === SYSTEM_PROGRAM && type === "transfer") {
    const fromOwner = stringField(info, "source");
    const toOwner = stringField(info, "destination");
    const amountRaw = integerAmount(info?.lamports);
    if (!fromOwner || !toOwner || !amountRaw) {
      return {
        id,
        cluster: input.cluster,
        signature: input.signature,
        slot: input.slot,
        instructionPath: input.path,
        blockTime: blockTimeMs,
        observedAt: input.observedAt,
        fromOwner,
        toOwner,
        asset: NATIVE_SOL_ASSET,
        amountRaw: amountRaw ?? "0",
        decimals: 9,
        resolution: "unresolved",
      };
    }
    return {
      id,
      cluster: input.cluster,
      signature: input.signature,
      slot: input.slot,
      instructionPath: input.path,
      blockTime: blockTimeMs,
      observedAt: input.observedAt,
      fromOwner,
      toOwner,
      asset: NATIVE_SOL_ASSET,
      amountRaw,
      decimals: 9,
      resolution: "resolved",
    };
  }

  if (programId !== null && isTokenProgram(programId) && (type === "transfer" || type === "transferChecked")) {
    const sourceTokenAccount = stringField(info, "source");
    const destinationTokenAccount = stringField(info, "destination");
    const amountRaw = tokenTransferAmount(info);
    const mintField = stringField(info, "mint");
    const sourceIndex = accountIndexOf(input.accountKeys, sourceTokenAccount);
    const destIndex = accountIndexOf(input.accountKeys, destinationTokenAccount);
    const mintInfo =
      mintFromBalances(input.post, destIndex) ??
      mintFromBalances(input.pre, destIndex) ??
      mintFromBalances(input.post, sourceIndex) ??
      mintFromBalances(input.pre, sourceIndex);
    const mint = mintField ?? mintInfo?.mint ?? null;
    const sourceOwner = tokenAccountOwner(sourceIndex, input.pre, input.post);
    const destOwner = tokenAccountOwner(destIndex, input.pre, input.post);
    const fromOwner = sourceOwner.owner;
    const toOwner = destOwner.owner;
    const resolved = mint ? resolveAsset(input.cluster, mint) : null;
    const supported = resolved?.kind === "canonical_usdc";
    const ownersAmbiguous = sourceOwner.ambiguous || destOwner.ambiguous;
    if (!supported) {
      return {
        id,
        cluster: input.cluster,
        signature: input.signature,
        slot: input.slot,
        instructionPath: input.path,
        blockTime: blockTimeMs,
        observedAt: input.observedAt,
        fromOwner,
        toOwner,
        sourceTokenAccount: sourceTokenAccount ?? undefined,
        destinationTokenAccount: destinationTokenAccount ?? undefined,
        asset: mint ?? "unknown_mint",
        amountRaw: amountRaw ?? "0",
        decimals: mintInfo?.decimals ?? 0,
        resolution: "unsupported",
      };
    }
    if (!fromOwner || !toOwner || !amountRaw || !mint || ownersAmbiguous) {
      return {
        id,
        cluster: input.cluster,
        signature: input.signature,
        slot: input.slot,
        instructionPath: input.path,
        blockTime: blockTimeMs,
        observedAt: input.observedAt,
        fromOwner,
        toOwner,
        sourceTokenAccount: sourceTokenAccount ?? undefined,
        destinationTokenAccount: destinationTokenAccount ?? undefined,
        asset: mint ?? "unknown_mint",
        amountRaw: amountRaw ?? "0",
        decimals: mintInfo?.decimals ?? resolved.decimals ?? 6,
        resolution: "unresolved",
      };
    }
    return {
      id,
      cluster: input.cluster,
      signature: input.signature,
      slot: input.slot,
      instructionPath: input.path,
      blockTime: blockTimeMs,
      observedAt: input.observedAt,
      fromOwner,
      toOwner,
      sourceTokenAccount: sourceTokenAccount ?? undefined,
      destinationTokenAccount: destinationTokenAccount ?? undefined,
      asset: mint,
      amountRaw,
      decimals: mintInfo?.decimals ?? resolved.decimals ?? 6,
      resolution: "resolved",
    };
  }

  return null;
}
