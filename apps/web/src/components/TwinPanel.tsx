import { compareAddresses } from "@doppel/engine";
import { AddressDiff } from "./AddressDiff";

export function TwinPanel(props: {
  leftLabel: string;
  left: string;
  rightLabel: string;
  right: string;
}) {
  const comparison = compareAddresses(props.left, props.right);
  const summary =
    comparison.status === "identical"
      ? "These addresses are identical."
      : comparison.status === "invalid"
        ? "One or both addresses are not valid 32-byte Solana addresses."
        : comparison.candidate
          ? `The first ${comparison.prefix} and last ${comparison.suffix} characters match, but these are different addresses. Similarity alone does not prove a scam.`
          : comparison.prefix === 0 && comparison.suffix === 0
            ? "These addresses do not share matching edges."
            : `Different addresses; ${comparison.prefix} characters at the start and ${comparison.suffix} at the end match.`;

  return (
    <section className="rounded-[20px] border border-line bg-ink p-5">
      <div className="grid gap-5 md:grid-cols-2">
        <AddressDiff address={props.left} other={props.right} label={props.leftLabel} />
        <AddressDiff address={props.right} other={props.left} label={props.rightLabel} />
      </div>
      <p className="mt-4 text-sm text-muted">{summary}</p>
    </section>
  );
}
