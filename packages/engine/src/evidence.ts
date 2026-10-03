import { compareAddresses } from "./similarity.ts";
import type { EvidenceFact, TransferEvent } from "./schemas.ts";

export type ExtractedEvidence = {
  facts: EvidenceFact[];
  previouslyPaid: { value: boolean; eventIds: string[] };
  incomingOnly: { value: boolean; eventIds: string[] };
  incomingFromDestination: TransferEvent[];
  resemblancePairs: Array<{
    eventId: string;
    otherAddress: string;
    prefix: number;
    suffix: number;
  }>;
};

function isResolved(event: TransferEvent): boolean {
  return event.resolution === "resolved";
}

export function extractEvidence(input: {
  sender: string;
  destination: string;
  events: TransferEvent[];
}): ExtractedEvidence {
  const { sender, destination, events } = input;
  const facts: EvidenceFact[] = [];
  const previouslyPaidEvents = events.filter(
    (event) => isResolved(event) && event.fromOwner === sender && event.toOwner === destination,
  );
  const incomingFromDestination = events.filter(
    (event) => isResolved(event) && event.fromOwner === destination && event.toOwner === sender,
  );
  const resemblancePairs: ExtractedEvidence["resemblancePairs"] = [];

  for (const event of events) {
    if (!isResolved(event)) {
      continue;
    }
    const counterparties = [event.fromOwner, event.toOwner].filter(
      (value): value is string => value !== null && value !== sender && value !== destination,
    );
    for (const other of counterparties) {
      const comparison = compareAddresses(destination, other);
      if (comparison.status === "different" && comparison.candidate) {
        resemblancePairs.push({
          eventId: event.id,
          otherAddress: other,
          prefix: comparison.prefix,
          suffix: comparison.suffix,
        });
        facts.push({
          code: "evidence.lookalike_counterparty",
          eventIds: [event.id],
          detail: {
            otherAddress: other,
            prefix: comparison.prefix,
            suffix: comparison.suffix,
          },
        });
      }
    }
  }

  if (previouslyPaidEvents.length > 0) {
    facts.push({
      code: "evidence.previously_paid_destination",
      eventIds: previouslyPaidEvents.map((event) => event.id),
      detail: { count: previouslyPaidEvents.length },
    });
  }

  if (incomingFromDestination.length > 0 && previouslyPaidEvents.length === 0) {
    facts.push({
      code: "evidence.incoming_only_destination",
      eventIds: incomingFromDestination.map((event) => event.id),
      detail: { count: incomingFromDestination.length },
    });
  }

  return {
    facts,
    previouslyPaid: {
      value: previouslyPaidEvents.length > 0,
      eventIds: previouslyPaidEvents.map((event) => event.id),
    },
    incomingOnly: {
      value: incomingFromDestination.length > 0 && previouslyPaidEvents.length === 0,
      eventIds: incomingFromDestination.map((event) => event.id),
    },
    incomingFromDestination,
    resemblancePairs,
  };
}
