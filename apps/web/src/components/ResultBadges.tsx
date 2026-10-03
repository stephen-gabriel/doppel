import type { Action, Continuity, CoverageEnvelope, Pattern } from "@doppel/engine";

const continuityCopy: Record<Continuity, string> = {
  exact: "Matches your saved recipient. Both full addresses are identical.",
  mismatch: "Different from your saved recipient. Get the address again from the person or service you intended to pay.",
  unconfirmed: "Your saved recipient needs confirmation. Review the full address in your address book first.",
  not_selected: "No saved recipient selected. We can check history, but cannot compare against your intended recipient.",
};
const patternCopy: Record<Pattern, string> = {
  suspected_poisoning: "Suspicious lookalike activity found. Review the evidence before using this address.",
  resemblance_only: "A similar address was found. Resemblance alone does not prove a scam.",
  none_observed: "No matching scam pattern found in the history we checked. This does not guarantee safety.",
  unknown: "The history check is incomplete. We cannot rule out lookalike activity.",
};

export function ContinuityBadge({ value }: { value: Continuity }) {
  return <p className={value === "exact" ? "text-match" : value === "mismatch" ? "text-pause" : "text-review"}>
    {continuityCopy[value]}
  </p>;
}
export function PatternBadge({ value }: { value: Pattern }) {
  return <p className={value === "suspected_poisoning" ? "text-pause" : "text-muted"}>{patternCopy[value]}</p>;
}
export function CoverageNote({ coverage: c }: { coverage: CoverageEnvelope }) {
  return <div className="rounded-[12px] bg-raised p-4 text-sm text-muted">
    {c.provider?.includes("fallback") ? <p className="mb-2 text-review">Using public Solana RPC because the primary provider is unavailable or not configured. Reads may be slower; live monitoring is separate.</p> : null}
    <p>{c.status === "partial" ? "Some history could not be checked." : c.status === "unavailable"
      ? "History could not be loaded. Try again later." : "The requested history range was checked."}</p>
    <p>Read {c.fetchedTransactionCount} transactions (up to {c.requestedTransactionCount} requested).
      {c.origin === "synthetic" ? " Example data, not a live result." : ` ${c.cluster === "devnet" ? "Test" : "Real"} network history.`}</p>
    <details className="mt-2">
      <summary className="cursor-pointer text-iris">Data source and limitations</summary>
      <p className="mt-2 break-words">Provider: {c.provider ?? "unavailable"}. Source: {c.origin} · {c.mode}.
        {c.limitReason ? ` Limit: ${c.limitReason}.` : ""}
        {c.cacheAgeSeconds !== null ? ` Cached ${c.cacheAgeSeconds}s ago.` : ""}</p>
      {c.warnings.map((warning, index) => <p className="mt-1 break-words" key={`${index}:${warning}`}>{warning}</p>)}
    </details>
  </div>;
}
export function ActionNote({ value }: { value: Action }) {
  return <p className={value === "pause" ? "text-pause" : "text-muted"}>
    {value === "pause" ? "Next: reconfirm the intended address through a source you trust."
      : value === "review" ? "Next: review the address comparison and any missing history above."
        : "The saved address matches. Still verify the intended person, full address and amount before paying."}
  </p>;
}
