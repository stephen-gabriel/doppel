import {
  evaluateContinuity,
  evaluatePattern,
  evaluatePolicy,
  isSupportedPaymentAsset,
  isValidAddress,
  type CheckResult,
  type CoverageEnvelope,
  type Draft,
  type RecipientRecord,
  type TransferEvent,
} from "@doppel/engine";

export function draftFingerprint(draft: Draft): string {
  return JSON.stringify([
    draft.cluster,
    draft.sender,
    draft.recipientId ?? "",
    draft.recipientRevision ?? "",
    draft.destination,
    draft.asset,
    draft.amountRaw,
  ]);
}

export function combineCheck(input: {
  draft: Draft;
  recipient: RecipientRecord | null;
  events: TransferEvent[];
  coverage: CoverageEnvelope | CoverageEnvelope["status"];
  now: number;
  stale: boolean;
  unresolvedSupportedTransfer?: boolean;
  historyLimitAcknowledged?: boolean;
}): CheckResult {
  const coverageStatus = typeof input.coverage === "string" ? input.coverage : input.coverage.status;
  const unresolvedFromEnvelope =
    typeof input.coverage === "string" ? false : input.coverage.unresolvedEventCount > 0;
  const draftValid = isValidAddress(input.draft.sender) && isValidAddress(input.draft.destination)
    && /^\d+$/.test(input.draft.amountRaw) && BigInt(input.draft.amountRaw) <= 18_446_744_073_709_551_615n;
  const draftSupported = isSupportedPaymentAsset(input.draft.cluster, input.draft.asset);
  const continuity = evaluateContinuity(input.draft, input.recipient);
  const pattern = evaluatePattern({
    sender: input.draft.sender,
    destination: input.draft.destination,
    events: input.events,
    coverage: coverageStatus,
    now: input.now,
  });
  const policy = evaluatePolicy({
    draftValid,
    draftSupported,
    continuity: continuity.continuity,
    pattern: pattern.pattern,
    coverage: coverageStatus,
    stale: input.stale,
    unresolvedSupportedTransfer: input.unresolvedSupportedTransfer ?? unresolvedFromEnvelope,
    historyLimitAcknowledged: input.historyLimitAcknowledged ?? false,
  });
  return {
    continuity: continuity.continuity,
    pattern: pattern.pattern,
    coverage: coverageStatus,
    action: policy.action,
    previouslyPaid: pattern.previouslyPaid,
    incomingOnly: pattern.incomingOnly,
    reasonCodes: [...continuity.reasonCodes, ...pattern.reasonCodes, ...policy.reasonCodes],
    evidence: pattern.evidence,
    ruleVersion: "0.1",
  };
}
