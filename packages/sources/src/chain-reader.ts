import {
  canonicalUsdcMint,
  isValidAddress,
  type Cluster,
  type CoverageEnvelope,
  type TransferEvent,
} from "@doppel/engine";
import { aggregateCoverage } from "./coverage.ts";
import { parseSupportedTransfers } from "./parse.ts";
import { RequestQueue } from "./queue.ts";
import { RpcClient, type ParsedTransaction, type SignatureInfo } from "./rpc.ts";
import type { ChainReader, HistoryEnvelope, HistoryRequest } from "./types.ts";

export type RpcChainReaderOptions = {
  endpoint: string;
  provider: string;
  rpsLimit?: number;
  fetchImpl?: typeof fetch;
  now?: () => number;
};

export class RpcChainReader implements ChainReader {
  private readonly rpc: RpcClient;
  private readonly queue: RequestQueue;
  private readonly now: () => number;
  private readonly provider: string;

  constructor(options: RpcChainReaderOptions) {
    this.rpc = new RpcClient(options.endpoint, options.fetchImpl);
    this.queue = new RequestQueue(options.rpsLimit ?? 5, options.now);
    this.now = options.now ?? (() => Date.now());
    this.provider = options.provider;
  }

  async readHistory(
    request: HistoryRequest,
    signal?: AbortSignal,
  ): Promise<HistoryEnvelope> {
    const checkedAt = this.now();
    const warnings: string[] = [];
    if (!isValidAddress(request.wallet)) {
      return {
        events: [],
        coverage: aggregateCoverage(request, {
          tokenAccountDiscovery: "not_applicable",
          uniqueSignatureCount: 0,
          truncatedMergedSignatures: false,
          paginationCapped: false,
          fetchedTransactionCount: 0,
          failedFetches: 0,
          unresolvedEventCount: 0,
          unsupportedEventCount: 0,
          aborted: false,
          listingFailed: true,
          warnings: ["Invalid wallet address."],
          lastEvaluatedSlot: null,
          observedFrom: null,
          observedTo: null,
          checkedAt,
          provider: this.provider,
        }),
      };
    }

    const includeSol = request.assets.includes("SOL");
    const usdcMint = canonicalUsdcMint(request.cluster);
    const includeUsdc = usdcMint !== null && request.assets.includes(usdcMint);
    if (!includeSol && !includeUsdc) {
      return {
        events: [],
        coverage: aggregateCoverage(request, {
          tokenAccountDiscovery: "not_applicable",
          uniqueSignatureCount: 0,
          truncatedMergedSignatures: false,
          paginationCapped: false,
          fetchedTransactionCount: 0,
          failedFetches: 0,
          unresolvedEventCount: 0,
          unsupportedEventCount: 0,
          aborted: false,
          listingFailed: true,
          warnings: ["No supported assets requested."],
          lastEvaluatedSlot: null,
          observedFrom: null,
          observedTo: null,
          checkedAt,
          provider: this.provider,
        }),
      };
    }

    let tokenAccounts: string[] = [];
    let tokenAccountDiscovery: CoverageEnvelope["tokenAccountDiscovery"] = "not_applicable";
    try {
      if (includeUsdc && usdcMint) {
        tokenAccounts = await this.discoverTokenAccounts(request.wallet, usdcMint, signal);
        tokenAccountDiscovery = "partial";
        warnings.push(
          "Token-account discovery lists currently owned accounts only; closed historical accounts are not recovered.",
        );
      }
    } catch (error) {
      tokenAccountDiscovery = "unavailable";
      warnings.push(`Token-account discovery failed: ${errorMessage(error)}`);
    }

    const addresses = includeSol ? [request.wallet, ...tokenAccounts] : tokenAccounts;
    const signatures = new Map<string, SignatureInfo>();
    let paginationCapped = false;
    try {
      for (const address of addresses) {
        const page = await this.listSignatures(address, request.maxTransactions, signal);
        for (const item of page.items) {
          signatures.set(item.signature, item);
        }
        if (page.capped) {
          paginationCapped = true;
        }
      }
    } catch (error) {
      return {
        events: [],
        coverage: aggregateCoverage(request, {
          tokenAccountDiscovery,
          uniqueSignatureCount: 0,
          truncatedMergedSignatures: false,
          paginationCapped: false,
          fetchedTransactionCount: 0,
          failedFetches: 0,
          unresolvedEventCount: 0,
          unsupportedEventCount: 0,
          aborted: Boolean(signal?.aborted),
          listingFailed: true,
          warnings: [...warnings, `Signature listing failed: ${errorMessage(error)}`],
          lastEvaluatedSlot: null,
          observedFrom: null,
          observedTo: null,
          checkedAt,
          provider: this.provider,
        }),
      };
    }

    const uniqueSignatureCount = signatures.size;
    const truncatedMergedSignatures = uniqueSignatureCount > request.maxTransactions;
    const ordered = [...signatures.values()]
      .sort((a, b) => b.slot - a.slot)
      .slice(0, request.maxTransactions);
    const events: TransferEvent[] = [];
    let fetched = 0;
    let failedFetches = 0;
    let lastSlot: number | null = null;
    const blockTimes: number[] = [];

    for (const info of ordered) {
      if (signal?.aborted) {
        warnings.push("Read cancelled.");
        break;
      }
      try {
        const tx = await this.fetchTransaction(info.signature, signal);
        fetched += 1;
        lastSlot = Math.max(lastSlot ?? 0, tx.slot);
        if (tx.blockTime !== null) {
          blockTimes.push(tx.blockTime * 1000);
        }
        events.push(
          ...parseSupportedTransfers({
            cluster: request.cluster,
            signature: info.signature,
            observedAt: checkedAt,
            transaction: tx,
          }),
        );
      } catch (error) {
        failedFetches += 1;
        warnings.push(`Transaction ${info.signature} failed: ${errorMessage(error)}`);
      }
    }

    const unsupportedEventCount = events.filter((event) => event.resolution === "unsupported").length;
    const unresolvedEventCount = events.filter((event) => event.resolution === "unresolved").length;

    return {
      events,
      coverage: aggregateCoverage(request, {
        tokenAccountDiscovery,
        uniqueSignatureCount,
        truncatedMergedSignatures,
        paginationCapped,
        fetchedTransactionCount: fetched,
        failedFetches,
        unresolvedEventCount,
        unsupportedEventCount,
        aborted: Boolean(signal?.aborted),
        listingFailed: false,
        warnings,
        lastEvaluatedSlot: lastSlot,
        observedFrom: blockTimes.length ? Math.min(...blockTimes) : null,
        observedTo: blockTimes.length ? Math.max(...blockTimes) : null,
        checkedAt,
        provider: this.provider,
      }),
    };
  }

  private async discoverTokenAccounts(
    owner: string,
    mint: string,
    signal?: AbortSignal,
  ): Promise<string[]> {
    const result = await this.queue.schedule(
      () =>
        this.rpc.call<{ value: Array<{ pubkey: string }> }>(
          {
            method: "getTokenAccountsByOwner",
            params: [owner, { mint }, { encoding: "jsonParsed" }],
          },
          { signal },
        ),
      signal,
    );
    return result.value.map((item) => item.pubkey);
  }

  private async listSignatures(
    address: string,
    limit: number,
    signal?: AbortSignal,
  ): Promise<{ items: SignatureInfo[]; capped: boolean }> {
    const items: SignatureInfo[] = [];
    let before: string | undefined;
    let capped = false;
    while (items.length < limit) {
      const pageLimit = Math.min(100, limit - items.length);
      const page = await this.queue.schedule(
        () =>
          this.rpc.call<SignatureInfo[]>(
            {
              method: "getSignaturesForAddress",
              params: [address, { limit: pageLimit, before, commitment: "confirmed" }],
            },
            { signal },
          ),
        signal,
      );
      if (page.length === 0) {
        break;
      }
      items.push(...page);
      before = page[page.length - 1]?.signature;
      if (page.length < pageLimit) {
        break;
      }
      if (items.length >= limit) {
        capped = true;
        break;
      }
    }
    return { items, capped };
  }

  private fetchTransaction(signature: string, signal?: AbortSignal): Promise<ParsedTransaction> {
    return this.queue.schedule(
      () =>
        this.rpc.call<ParsedTransaction>(
          {
            method: "getTransaction",
            params: [
              signature,
              {
                encoding: "jsonParsed",
                maxSupportedTransactionVersion: 0,
                commitment: "confirmed",
              },
            ],
          },
          { signal },
        ),
      signal,
    );
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown_error";
}

export function clusterEndpoint(cluster: Cluster, env: NodeJS.ProcessEnv = process.env): string {
  if (cluster === "devnet") {
    return env.DEVNET_RPC_URL ?? "https://api.devnet.solana.com";
  }
  if (cluster === "mainnet-beta") {
    return env.PUBLIC_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  }
  throw new Error("local-test has no public RPC");
}
