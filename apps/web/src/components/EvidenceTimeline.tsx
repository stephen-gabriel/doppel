import type { TransferEvent } from "@doppel/engine";
import { resolveAsset } from "@doppel/engine";
import { formatRawAmount } from "../lib/amounts";

function direction(event: TransferEvent, sender: string): string {
  if (event.fromOwner === sender) return "outgoing";
  if (event.toOwner === sender) return "incoming";
  return "other";
}

export function EvidenceTimeline(props: { events: TransferEvent[]; sender: string }) {
  if (props.events.length === 0) {
    return (
      <p className="text-muted">
        No supported transfers were found in this checked range. This does not establish recipient identity.
      </p>
    );
  }
  return (
    <ol className="space-y-3">
      {props.events.map((event) => (
        <li key={event.id} className="rounded-[12px] border border-line bg-raised p-3 font-mono text-sm">
          <p>
            {event.blockTime === null
              ? "Time unknown (no block time)"
              : new Date(event.blockTime).toISOString()}{" "}
            · slot {event.slot} · {direction(event, props.sender)} · {event.resolution}
          </p>
          <p className="break-all text-muted">
            {event.fromOwner ?? "unresolved"} → {event.toOwner ?? "unresolved"} · {formatRawAmount(event.amountRaw, event.decimals)} {resolveAsset(event.cluster, event.asset).displayLabel}
          </p>
          <p className="break-all text-muted">
            {event.signature} / {event.instructionPath}
          </p>
        </li>
      ))}
    </ol>
  );
}
