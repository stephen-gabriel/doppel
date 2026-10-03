import { RULE_VERSION, type Action, type Continuity, type CoverageStatus, type Pattern } from "./schemas.ts";

export type PolicyInput = {
  draftValid: boolean;
  draftSupported: boolean;
  continuity: Continuity;
  pattern: Pattern;
  coverage: CoverageStatus;
  stale: boolean;
  unresolvedSupportedTransfer: boolean;
  historyLimitAcknowledged?: boolean;
};

export type PolicyEvaluation = {
  action: Action;
  reasonCodes: string[];
  ruleVersion: typeof RULE_VERSION;
};

export function evaluatePolicy(input: PolicyInput): PolicyEvaluation {
  if (!input.draftValid || !input.draftSupported) {
    return {
      action: "review",
      reasonCodes: ["policy.invalid_or_unsupported_draft"],
      ruleVersion: RULE_VERSION,
    };
  }

  if (input.continuity === "mismatch" || input.pattern === "suspected_poisoning") {
    return {
      action: "pause",
      reasonCodes:
        input.continuity === "mismatch"
          ? ["policy.pause_mismatch"]
          : ["policy.pause_suspected_poisoning"],
      ruleVersion: RULE_VERSION,
    };
  }

  if (
    input.continuity === "unconfirmed" ||
    input.continuity === "not_selected" ||
    input.pattern === "resemblance_only" ||
    input.coverage === "unavailable" ||
    input.stale ||
    input.unresolvedSupportedTransfer ||
    (input.pattern === "unknown" && input.coverage !== "partial")
  ) {
    return {
      action: "review",
      reasonCodes: ["policy.review"],
      ruleVersion: RULE_VERSION,
    };
  }

  if (input.coverage === "partial") {
    return {
      action: input.historyLimitAcknowledged ? "ready_for_confirmation" : "review",
      reasonCodes: [input.historyLimitAcknowledged
        ? "policy.limited_history_acknowledged"
        : "policy.history_acknowledgment_required"],
      ruleVersion: RULE_VERSION,
    };
  }

  return {
    action: "ready_for_confirmation",
    reasonCodes: ["policy.ready_for_confirmation"],
    ruleVersion: RULE_VERSION,
  };
}
