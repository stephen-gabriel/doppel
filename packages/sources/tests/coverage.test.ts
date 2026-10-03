import { describe, expect, it } from "vitest";
import { aggregateCoverage } from "../src/coverage.ts";

const request = {
  cluster: "mainnet-beta" as const,
  wallet: "5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc",
  assets: ["SOL"],
  maxTransactions: 8,
};

describe("aggregateCoverage", () => {
  it("marks partial token-account discovery as incomplete", () => {
    const coverage = aggregateCoverage(request, {
      tokenAccountDiscovery: "partial",
      uniqueSignatureCount: 3,
      truncatedMergedSignatures: false,
      paginationCapped: false,
      fetchedTransactionCount: 3,
      failedFetches: 0,
      unresolvedEventCount: 0,
      unsupportedEventCount: 0,
      aborted: false,
      listingFailed: false,
      warnings: ["closed accounts"],
      lastEvaluatedSlot: 1,
      observedFrom: 1,
      observedTo: 2,
      checkedAt: 3,
      provider: "mock",
    });
    expect(coverage.status).toBe("partial");
  });

  it("does not call merged-signature truncation complete", () => {
    const coverage = aggregateCoverage(request, {
      tokenAccountDiscovery: "not_applicable",
      uniqueSignatureCount: 12,
      truncatedMergedSignatures: true,
      paginationCapped: false,
      fetchedTransactionCount: 8,
      failedFetches: 0,
      unresolvedEventCount: 0,
      unsupportedEventCount: 0,
      aborted: false,
      listingFailed: false,
      warnings: [],
      lastEvaluatedSlot: 1,
      observedFrom: 1,
      observedTo: 2,
      checkedAt: 3,
      provider: "mock",
    });
    expect(coverage.status).toBe("partial");
    expect(coverage.limitReason).toBe("transaction_cap");
  });

  it("keeps unresolved supported transfers out of complete_within_scope", () => {
    const coverage = aggregateCoverage(request, {
      tokenAccountDiscovery: "not_applicable",
      uniqueSignatureCount: 1,
      truncatedMergedSignatures: false,
      paginationCapped: false,
      fetchedTransactionCount: 1,
      failedFetches: 0,
      unresolvedEventCount: 1,
      unsupportedEventCount: 0,
      aborted: false,
      listingFailed: false,
      warnings: [],
      lastEvaluatedSlot: 1,
      observedFrom: null,
      observedTo: null,
      checkedAt: 3,
      provider: "mock",
    });
    expect(coverage.status).toBe("partial");
  });
});
