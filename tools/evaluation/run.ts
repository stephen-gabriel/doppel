// Explicit M4 scenario evaluation. Never imported by the development test suite.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { evaluatePattern, evaluateContinuity, MAINNET_USDC_MINT, RULE_VERSION,
  type TransferEvent, type Pattern, type CoverageStatus, type Draft, type RecipientRecord } from "../../packages/engine/src/index.ts";

const wallet = "5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc";
const real = "4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY";
const spoof = "4yfuQCL4fnNfSbBgqFcPTFn5GGZABDaEFQLhGpwjizcY";
const other = "11111111111111111111111111111111";
const base = 1_790_000_000_000;
const hour = 3_600_000;
function event(name: string, time: number | null, from: string, to: string, amount: string, extra: Partial<TransferEvent> = {}): TransferEvent {
  return { id: `mainnet-beta:synthetic:${name}:0`, cluster: "mainnet-beta", signature: `synthetic:${name}`,
    instructionPath: "0", slot: time === null ? 10 : Math.floor((time - base) / 1000) + 100,
    blockTime: time, observedAt: base + 100 * hour, fromOwner: from, toOwner: to,
    asset: "SOL", amountRaw: amount, decimals: 9, resolution: "resolved", ...extra };
}
const paid = event("pay", base, wallet, real, "100000000");
const dust = event("dust", base + hour, spoof, wallet, "1000");
type Case = { id: string; events: TransferEvent[]; expected: Pattern; destination?: string;
  coverage?: CoverageStatus; cutoff?: number; knownAttack: boolean | null; note?: string };
const cases: Case[] = [
  { id: "positive-sol-4plus1", events: [paid, dust], expected: "suspected_poisoning", knownAttack: true },
  { id: "positive-usdc", events: [paid, { ...dust, asset: MAINNET_USDC_MINT, decimals: 6 }], expected: "suspected_poisoning", knownAttack: true },
  { id: "positive-out-of-order-arrival", events: [dust, paid], expected: "suspected_poisoning", knownAttack: true },
  { id: "positive-duplicate-delivery", events: [paid, dust, { ...dust }], expected: "suspected_poisoning", knownAttack: true },
  { id: "positive-prior-mistaken-payment", events: [paid, dust, event("mistake", base + 2 * hour, wallet, spoof, "200000000")], expected: "suspected_poisoning", knownAttack: true },
  { id: "positive-repeated-dust", events: [paid, dust, event("dust-again", base + 2 * hour, spoof, wallet, "1000")], expected: "suspected_poisoning", knownAttack: true },
  { id: "positive-partial-history", events: [paid, dust], coverage: "partial", expected: "suspected_poisoning", knownAttack: true },
  { id: "FINAL-LARGE-INCOMING", events: [paid, { ...dust, amountRaw: "500000" }], expected: "resemblance_only", knownAttack: true, note: "Known synthetic attack above the current dust threshold; miss by design." },
  { id: "miss-after-48-hours", events: [paid, event("late", base + 49 * hour, spoof, wallet, "1000")], expected: "resemblance_only", knownAttack: true },
  { id: "FINAL-PAT-MISSING-BLOCKTIME", events: [{ ...paid, blockTime: null }, dust], expected: "resemblance_only", knownAttack: true },
  { id: "FINAL-PAT-SYMBOL-NOT-MINT", events: [paid, { ...dust, asset: "USDC" }], expected: "resemblance_only", knownAttack: null },
  { id: "FINAL-REFUND-EXACT-A", events: [paid, event("refund", base + hour, real, wallet, "1000")], destination: real, expected: "none_observed", knownAttack: false },
  { id: "benign-unrelated-dust", events: [paid, event("ordinary", base + hour, other, wallet, "1000")], destination: other, expected: "none_observed", knownAttack: false },
  { id: "benign-incoming-before-payment", events: [event("early", base - hour, spoof, wallet, "1000"), paid], expected: "resemblance_only", knownAttack: false },
  { id: "benign-lookalike-refund-with-prior-contact", events: [event("earlier", base - hour, wallet, spoof, "100000"), paid, dust], expected: "resemblance_only", knownAttack: false },
  { id: "benign-coincidence-identical-observable-pattern", events: [paid, dust], expected: "suspected_poisoning", knownAttack: false, note: "Intentionally benign synthetic intent with attack-like observable events; demonstrates unavoidable heuristic false positive." },
  { id: "empty-complete", events: [], expected: "none_observed", knownAttack: false },
  { id: "empty-partial", events: [], coverage: "partial", expected: "unknown", knownAttack: null },
  { id: "provider-unavailable", events: [paid, dust], coverage: "unavailable", expected: "unknown", knownAttack: null },
  { id: "unresolved-owner", events: [paid, { ...dust, resolution: "unresolved", fromOwner: null }], coverage: "partial", expected: "resemblance_only", knownAttack: null },
  { id: "pre-contact-cutoff", events: [paid, dust], cutoff: base + 1000, expected: "resemblance_only", knownAttack: null },
  { id: "no-evidence-before-cutoff", events: [paid, dust], cutoff: base - 1000, expected: "none_observed", knownAttack: null },
  { id: "benign-exact-old-payee", events: [paid], destination: real, expected: "none_observed", knownAttack: false },
];
const frozenFiles = ["pattern.ts", "evidence.ts", "similarity.ts", "order.ts", "continuity.ts"];
const hashes = Object.fromEntries(frozenFiles.map((file) => [file, createHash("sha256")
  .update(readFileSync(new URL(`../../packages/engine/src/${file}`, import.meta.url))).digest("hex")]));
const results = cases.map((item) => {
  const result = evaluatePattern({ sender: wallet, destination: item.destination ?? spoof, events: item.events,
    coverage: item.coverage ?? "complete_within_scope", now: base + 100 * hour,
    ...(item.cutoff === undefined ? {} : { cutoff: item.cutoff }) });
  return { id: item.id, expected: item.expected, actual: result.pattern, matchesExpectedBehavior: result.pattern === item.expected,
    knownSyntheticAttack: item.knownAttack, cutoff: item.cutoff ?? null, note: item.note ?? null,
    evidenceEventIds: [...new Set(result.evidence.flatMap((fact) => fact.eventIds))] };
});
const recipient: RecipientRecord = { id: "r", cluster: "mainnet-beta", address: real, label: "test",
  confirmationStatus: "confirmed", confirmationMethod: "synthetic", confirmedAt: base, revision: 1,
  createdAt: base, updatedAt: base, addressHistory: [] };
const draft: Draft = { cluster: "devnet", sender: wallet, destination: real, asset: "SOL", amountRaw: "1", recipientId: "r", recipientRevision: 1 };
const continuity = evaluateContinuity(draft, recipient);
const labelled = results.filter((result) => result.knownSyntheticAttack !== null);
const counts = { tp: 0, fp: 0, tn: 0, fn: 0 };
for (const result of labelled) {
  const positive = result.actual === "suspected_poisoning";
  if (result.knownSyntheticAttack) positive ? counts.tp++ : counts.fn++;
  else positive ? counts.fp++ : counts.tn++;
}
const report = {
  generatedAt: new Date().toISOString(), ruleVersion: RULE_VERSION, frozenSourceSha256: hashes,
  independence: "Synthetic scenarios, not an independent holdout. Original reserved manifest was descriptions only; cases overlap development tests and share an address family. No rule tuning during this evaluation.",
  source: "Published Pine strings; all transaction sequences/amounts/times/intent labels are synthetic. No historical incident reconstruction.",
  counts: { patternCases: results.length, expectedBehaviorMatches: results.filter((r) => r.matchesExpectedBehavior).length,
    labelledPatternCases: labelled.length, unlabelledCases: results.length - labelled.length,
    unknownOutputs: results.filter((r) => r.actual === "unknown").length, ...counts },
  syntheticPrecision: counts.tp + counts.fp ? counts.tp / (counts.tp + counts.fp) : null,
  syntheticRecall: counts.tp + counts.fn ? counts.tp / (counts.tp + counts.fn) : null,
  continuityCase: { id: "FINAL-CONT-CROSS-CLUSTER", actual: continuity.continuity,
    matchesExpectedBehavior: continuity.continuity !== "exact", reasonCodes: continuity.reasonCodes },
  results,
};
console.log(JSON.stringify(report, null, 2));
if (results.some((r) => !r.matchesExpectedBehavior) || continuity.continuity === "exact") process.exitCode = 1;
