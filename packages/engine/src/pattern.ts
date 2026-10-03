import { resolveAsset } from "./assets.ts";
import { compareEventOrder, isAtOrBeforeCutoff, millisecondsBetween } from "./order.ts";
import {
  RULE_VERSION,
  type Cluster,
  type CoverageStatus,
  type Pattern,
  type RuleConfig,
  type TransferEvent,
} from "./schemas.ts";
import { compareAddresses } from "./similarity.ts";
import { extractEvidence } from "./evidence.ts";

export type PatternEvaluation = {
  pattern: Pattern;
  reasonCodes: string[];
  evidence: ReturnType<typeof extractEvidence>["facts"];
  previouslyPaid: ReturnType<typeof extractEvidence>["previouslyPaid"];
  incomingOnly: ReturnType<typeof extractEvidence>["incomingOnly"];
  ruleVersion: typeof RULE_VERSION;
};

function dustLimit(event: TransferEvent, config: RuleConfig): bigint | null {
  const resolved = resolveAsset(event.cluster as Cluster, event.asset);
  if (resolved.kind === "sol") {
    return config.dustSolMaxLamports;
  }
  if (resolved.kind === "canonical_usdc") {
    return config.dustUsdcMaxRaw;
  }
  return null;
}

function isDust(event: TransferEvent, config: RuleConfig): boolean {
  const limit = dustLimit(event, config);
  if (limit === null) {
    return false;
  }
  return BigInt(event.amountRaw) <= limit;
}

export const DEFAULT_RULE_CONFIG: RuleConfig = {
  ruleVersion: RULE_VERSION,
  dustSolMaxLamports: 5000n,
  dustUsdcMaxRaw: 10000n,
  patternWindowHours: 48,
};

export function evaluatePattern(input: {
  sender: string;
  destination: string;
  events: TransferEvent[];
  coverage: CoverageStatus;
  now: number;
  cutoff?: number;
  config?: RuleConfig;
}): PatternEvaluation {
  const config = input.config ?? DEFAULT_RULE_CONFIG;
  const cutoff = input.cutoff;
  const events = input.events.filter((event) => {
    if (cutoff === undefined) {
      return true;
    }
    const relative = isAtOrBeforeCutoff(event, cutoff);
    return relative === true;
  });
  const extracted = extractEvidence({
    sender: input.sender,
    destination: input.destination,
    events,
  });

  if (input.coverage === "unavailable") {
    return {
      pattern: "unknown",
      reasonCodes: ["pattern.coverage_unavailable"],
      evidence: extracted.facts,
      previouslyPaid: extracted.previouslyPaid,
      incomingOnly: extracted.incomingOnly,
      ruleVersion: RULE_VERSION,
    };
  }

  const windowMs = config.patternWindowHours * 60 * 60 * 1000;
  const reasonCodes: string[] = [];
  const evidence = [...extracted.facts];
  let suspected = false;
  let timingUnknown = false;

  const priorOutgoing = events.filter(
    (event) =>
      event.resolution === "resolved" &&
      event.fromOwner === input.sender &&
      event.toOwner !== null &&
      event.toOwner !== input.sender &&
      event.toOwner !== input.destination,
  );

  for (const incoming of extracted.incomingFromDestination) {
    if (!isDust(incoming, config)) {
      reasonCodes.push("pattern.incoming_not_dust");
      continue;
    }

    const earlierContact = events.some((event) => {
      if (
        event.id === incoming.id ||
        event.resolution !== "resolved" ||
        (event.fromOwner !== input.destination && event.toOwner !== input.destination)
      ) {
        return false;
      }
      return compareEventOrder(event, incoming) === "before";
    });
    if (earlierContact) {
      reasonCodes.push("pattern.destination_seen_before_incoming");
      continue;
    }

    const reference = priorOutgoing.find((event) => {
      const paid = event.toOwner;
      if (paid === null) {
        return false;
      }
      const comparison = compareAddresses(paid, input.destination);
      if (comparison.status !== "different" || !comparison.candidate) {
        return false;
      }
      const order = compareEventOrder(event, incoming);
      if (order === "unknown") {
        timingUnknown = true;
        reasonCodes.push("pattern.timing_unknown");
        return false;
      }
      if (order !== "before") {
        return false;
      }
      const gap = millisecondsBetween(event, incoming);
      if (gap === null) {
        timingUnknown = true;
        reasonCodes.push("pattern.timing_unknown");
        return false;
      }
      return gap >= 0 && gap <= windowMs;
    });

    if (reference) {
      suspected = true;
      reasonCodes.push("pattern.suspected_poisoning");
      const comparison = compareAddresses(reference.toOwner ?? "", input.destination);
      evidence.push({
        code: "pattern.sequence",
        eventIds: [reference.id, incoming.id],
        detail: {
          prefix: comparison.status === "different" ? comparison.prefix : 0,
          suffix: comparison.status === "different" ? comparison.suffix : 0,
          coverageQualified: input.coverage !== "complete_within_scope",
        },
      });
    }
  }

  if (suspected) {
    return {
      pattern: "suspected_poisoning",
      reasonCodes,
      evidence,
      previouslyPaid: extracted.previouslyPaid,
      incomingOnly: extracted.incomingOnly,
      ruleVersion: RULE_VERSION,
    };
  }

  if (extracted.resemblancePairs.length > 0) {
    return {
      pattern: "resemblance_only",
      reasonCodes: [
        ...reasonCodes,
        timingUnknown ? "pattern.timing_unknown" : "pattern.resemblance_only",
      ],
      evidence,
      previouslyPaid: extracted.previouslyPaid,
      incomingOnly: extracted.incomingOnly,
      ruleVersion: RULE_VERSION,
    };
  }

  if (input.coverage === "partial") {
    return {
      pattern: "unknown",
      reasonCodes: [...reasonCodes, "pattern.partial_coverage"],
      evidence,
      previouslyPaid: extracted.previouslyPaid,
      incomingOnly: extracted.incomingOnly,
      ruleVersion: RULE_VERSION,
    };
  }

  return {
    pattern: "none_observed",
    reasonCodes: [...reasonCodes, "pattern.none_observed"],
    evidence,
    previouslyPaid: extracted.previouslyPaid,
    incomingOnly: extracted.incomingOnly,
    ruleVersion: RULE_VERSION,
  };
}
