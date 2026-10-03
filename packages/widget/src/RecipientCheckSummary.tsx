import type { CheckResult, CoverageEnvelope } from "@doppel/engine";

export function RecipientCheckSummary(props: {
  result: CheckResult;
  coverage?: CoverageEnvelope | null | undefined;
  stale?: boolean | undefined;
}) {
  const { result, coverage, stale } = props;
  return (
    <section aria-live="polite" className="space-y-2">
      <p>{result.continuity === "exact" ? "Matches your saved recipient."
        : result.continuity === "mismatch" ? "Different from your saved recipient. Reconfirm the receiving address."
          : result.continuity === "unconfirmed" ? "Confirm this recipient in your address book first."
            : "Choose a saved recipient to compare addresses."}</p>
      {coverage?.provider?.includes("fallback") ? <p>Using public Solana RPC as a fallback. Reads may be slower; monitoring availability does not affect this saved-address comparison.</p> : null}
      {coverage && !stale ? <>
        <p>{result.pattern === "suspected_poisoning" ? "Suspicious lookalike activity found. Do not continue this payment."
          : result.pattern === "resemblance_only" ? "A similar address was found. Review it before proceeding."
            : result.pattern === "none_observed" ? "No matching scam pattern found in the checked history."
              : "History check incomplete. We cannot rule out lookalike activity."}</p>
        <p>{result.coverage === "partial" ? "Some payment history is missing."
          : result.coverage === "unavailable" ? "Payment history could not be loaded."
            : "The requested history range was checked."}</p>
      </> : null}
      {!stale && result.action === "ready_for_confirmation" ? <p>Ready for your final review—not a guarantee of safety.</p> : null}
      {result.reasonCodes.includes("policy.limited_history_acknowledged") ? (
        <p>Continuing on your confirmed recipient record with acknowledged history limits, not a safety verdict.</p>
      ) : null}
      {stale ? <p>Payment details changed or the check expired. Check again before continuing.</p> : null}
      {coverage ? (
        <details className="text-sm"><summary className="cursor-pointer">History details and limitations</summary><p>
          History scope includes supported SOL and canonical USDC. Fetched {coverage.fetchedTransactionCount} transactions
          with a limit of {coverage.requestedTransactionCount}. Source: {coverage.provider ?? "unavailable"} · {coverage.origin} · {coverage.mode}.
        </p>
        {coverage.warnings.map((warning, index) => <p key={`${index}:${warning}`}>{warning}</p>)}
        </details>
      ) : null}
    </section>
  );
}
