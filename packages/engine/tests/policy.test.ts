import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "../src/policy.ts";

describe("evaluatePolicy", () => {
  it("permits acknowledged partial history only for a fresh exact recipient without unresolved evidence", () => {
    const input = { draftValid: true, draftSupported: true, continuity: "exact" as const,
      pattern: "unknown" as const, coverage: "partial" as const, stale: false,
      unresolvedSupportedTransfer: false, historyLimitAcknowledged: true };
    expect(evaluatePolicy(input).action).toBe("ready_for_confirmation");
    expect(evaluatePolicy({ ...input, stale: true }).action).toBe("review");
    expect(evaluatePolicy({ ...input, coverage: "unavailable" }).action).toBe("review");
    expect(evaluatePolicy({ ...input, unresolvedSupportedTransfer: true }).action).toBe("review");
    expect(evaluatePolicy({ ...input, continuity: "unconfirmed" }).action).toBe("review");
    expect(evaluatePolicy({ ...input, pattern: "resemblance_only" }).action).toBe("review");
    expect(evaluatePolicy({ ...input, pattern: "suspected_poisoning" }).action).toBe("pause");
    expect(evaluatePolicy({ ...input, continuity: "mismatch" }).action).toBe("pause");
  });
  it("pauses on saved-recipient mismatch regardless of coverage", () => {
    const result = evaluatePolicy({
      draftValid: true,
      draftSupported: true,
      continuity: "mismatch",
      pattern: "none_observed",
      coverage: "unavailable",
      stale: false,
      unresolvedSupportedTransfer: false,
    });
    expect(result.action).toBe("pause");
  });

  it("pauses on suspected poisoning even with prior payments implied elsewhere", () => {
    const result = evaluatePolicy({
      draftValid: true,
      draftSupported: true,
      continuity: "exact",
      pattern: "suspected_poisoning",
      coverage: "partial",
      stale: false,
      unresolvedSupportedTransfer: false,
    });
    expect(result.action).toBe("pause");
  });

  it("reviews when no recipient is selected or coverage is incomplete", () => {
    const noRecipient = evaluatePolicy({
      draftValid: true,
      draftSupported: true,
      continuity: "not_selected",
      pattern: "none_observed",
      coverage: "complete_within_scope",
      stale: false,
      unresolvedSupportedTransfer: false,
    });
    expect(noRecipient.action).toBe("review");

    const partial = evaluatePolicy({
      draftValid: true,
      draftSupported: true,
      continuity: "exact",
      pattern: "none_observed",
      coverage: "partial",
      stale: false,
      unresolvedSupportedTransfer: false,
    });
    expect(partial.action).toBe("review");
  });

  it("allows ready_for_confirmation only for exact + complete + none_observed", () => {
    const result = evaluatePolicy({
      draftValid: true,
      draftSupported: true,
      continuity: "exact",
      pattern: "none_observed",
      coverage: "complete_within_scope",
      stale: false,
      unresolvedSupportedTransfer: false,
    });
    expect(result.action).toBe("ready_for_confirmation");
  });

  it("does not treat empty evidence as verified safety when coverage is unknown", () => {
    const result = evaluatePolicy({
      draftValid: true,
      draftSupported: true,
      continuity: "exact",
      pattern: "unknown",
      coverage: "unavailable",
      stale: false,
      unresolvedSupportedTransfer: false,
    });
    expect(result.action).toBe("review");
  });
});
