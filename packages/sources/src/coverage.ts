import { RULE_VERSION, type CoverageEnvelope } from "@doppel/engine";
import type { HistoryRequest } from "./types.ts";

export type CoverageInputs = {
  tokenAccountDiscovery: CoverageEnvelope["tokenAccountDiscovery"];
  uniqueSignatureCount: number;
  truncatedMergedSignatures: boolean;
  paginationCapped: boolean;
  fetchedTransactionCount: number;
  failedFetches: number;
  unresolvedEventCount: number;
  unsupportedEventCount: number;
  aborted: boolean;
  listingFailed: boolean;
  warnings: string[];
  lastEvaluatedSlot: number | null;
  observedFrom: number | null;
  observedTo: number | null;
  checkedAt: number;
  provider: string;
};

export function aggregateCoverage(
  request: HistoryRequest,
  input: CoverageInputs,
): CoverageEnvelope {
  const warnings = [...input.warnings];
  let limitReason: string | null = null;
  let status: CoverageEnvelope["status"] = "complete_within_scope";

  if (input.listingFailed) {
    status = "unavailable";
    limitReason = "rpc_error";
  } else if (input.aborted && input.fetchedTransactionCount === 0) {
    status = "unavailable";
    limitReason = "cancelled";
  } else {
    const gaps: string[] = [];
    if (input.tokenAccountDiscovery === "partial" || input.tokenAccountDiscovery === "unavailable") {
      gaps.push("token_account_discovery");
    }
    if (input.unresolvedEventCount > 0) {
      gaps.push("unresolved_supported_transfers");
    }
    if (input.truncatedMergedSignatures || input.paginationCapped) {
      gaps.push("transaction_cap");
      limitReason = "transaction_cap";
      warnings.push(`Reached the ${request.maxTransactions}-transaction cap.`);
    }
    if (input.failedFetches > 0) {
      gaps.push("partial_fetch");
      limitReason = limitReason ?? "partial_fetch";
    }
    if (input.aborted) {
      gaps.push("cancelled");
      limitReason = limitReason ?? "cancelled";
    }
    if (gaps.length > 0) {
      status =
        input.fetchedTransactionCount === 0 && input.unresolvedEventCount === 0
          ? input.listingFailed
            ? "unavailable"
            : "partial"
          : "partial";
    }
  }

  return {
    status,
    wallet: request.wallet,
    cluster: request.cluster,
    origin: "chain",
    mode: "historical",
    provider: input.provider,
    ruleVersion: RULE_VERSION,
    checkedAt: input.checkedAt,
    requestedFrom: null,
    requestedTo: null,
    observedFrom: input.observedFrom,
    observedTo: input.observedTo,
    lastEvaluatedSlot: input.lastEvaluatedSlot,
    requestedTransactionCount: request.maxTransactions,
    fetchedTransactionCount: input.fetchedTransactionCount,
    tokenAccountDiscovery: input.tokenAccountDiscovery,
    unsupportedEventCount: input.unsupportedEventCount,
    unresolvedEventCount: input.unresolvedEventCount,
    limitReason,
    cacheAgeSeconds: null,
    warnings,
  };
}
