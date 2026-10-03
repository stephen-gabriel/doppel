import { RULE_VERSION, type Draft, type RecipientRecord } from "./schemas.ts";
import { validateAddress } from "./address.ts";

export type ContinuityEvaluation = {
  continuity: "exact" | "mismatch" | "unconfirmed" | "not_selected";
  reasonCodes: string[];
  recipientId: string | null;
  recipientRevision: number | null;
  ruleVersion: typeof RULE_VERSION;
};

export function evaluateContinuity(
  draft: Draft,
  recipient: RecipientRecord | null,
): ContinuityEvaluation {
  if (draft.recipientId === null || recipient === null) {
    return {
      continuity: "not_selected",
      reasonCodes: ["continuity.not_selected"],
      recipientId: null,
      recipientRevision: null,
      ruleVersion: RULE_VERSION,
    };
  }

  if (recipient.id !== draft.recipientId) {
    return {
      continuity: "not_selected",
      reasonCodes: ["continuity.recipient_id_mismatch"],
      recipientId: draft.recipientId,
      recipientRevision: draft.recipientRevision,
      ruleVersion: RULE_VERSION,
    };
  }

  if (recipient.cluster !== draft.cluster) {
    return {
      continuity: "mismatch",
      reasonCodes: ["continuity.cluster_mismatch"],
      recipientId: recipient.id,
      recipientRevision: recipient.revision,
      ruleVersion: RULE_VERSION,
    };
  }

  if (
    draft.recipientRevision === null ||
    recipient.revision !== draft.recipientRevision
  ) {
    return {
      continuity: "unconfirmed",
      reasonCodes: ["continuity.revision_stale"],
      recipientId: recipient.id,
      recipientRevision: recipient.revision,
      ruleVersion: RULE_VERSION,
    };
  }

  const destination = validateAddress(draft.destination);
  const saved = validateAddress(recipient.address);
  if (!destination.valid || !saved.valid) {
    return {
      continuity: "mismatch",
      reasonCodes: ["continuity.invalid_address"],
      recipientId: recipient.id,
      recipientRevision: recipient.revision,
      ruleVersion: RULE_VERSION,
    };
  }

  if (recipient.confirmationStatus !== "confirmed") {
    const exact = draft.destination === recipient.address;
    return {
      continuity: exact ? "unconfirmed" : "mismatch",
      reasonCodes: exact
        ? ["continuity.unconfirmed_record"]
        : ["continuity.mismatch", "continuity.unconfirmed_record"],
      recipientId: recipient.id,
      recipientRevision: recipient.revision,
      ruleVersion: RULE_VERSION,
    };
  }

  if (draft.destination !== recipient.address) {
    return {
      continuity: "mismatch",
      reasonCodes: ["continuity.mismatch"],
      recipientId: recipient.id,
      recipientRevision: recipient.revision,
      ruleVersion: RULE_VERSION,
    };
  }

  return {
    continuity: "exact",
    reasonCodes: ["continuity.exact"],
    recipientId: recipient.id,
    recipientRevision: recipient.revision,
    ruleVersion: RULE_VERSION,
  };
}
