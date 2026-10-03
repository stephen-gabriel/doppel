# Frozen-rule scenario evaluation — M4 preparation

Run: `pnpm evaluate`, 2026-10-02T23:01:23.503Z. Detector rule 0.1; no detector tuning during this run. Inputs and all expected outcomes are reproducible in `tools/evaluation/run.ts`. The original reserved manifest is preserved unchanged.

## Scope and independence

**This is synthetic scenario evaluation, not an independent real-world accuracy benchmark.** The reserved five-case manifest contained descriptions rather than full event inputs, and several scenarios already had development regressions. The executable set was assembled at evaluation time and shares a published address family. Cases are deliberately constructed, not prevalence-weighted or statistically independent.

Published addresses come from Pine Analytics; all event signatures, amounts, timestamps and attack/benign intent labels in this evaluation are synthetic. No historical chain reconstruction or real loss-prevention claim. The actual devnet SOL transfer validates payment execution separately, not detector accuracy.

## Results

| Measure | Observed |
|---|---|
| Pattern scenarios | 23 |
| Matched declared implementation behavior | 23/23 |
| Additional cross-cluster continuity case | Correctly returns mismatch |
| Synthetic intent-labelled pattern decisions | 17 |
| Unlabelled/coverage scenarios excluded from confusion counts | 6 |
| True positives / false positives | 7 / 1 |
| True negatives / false negatives | 6 / 3 |
| Unknown outputs | 2/23 |
| Synthetic precision | 7/8 = 87.5% |
| Synthetic recall | 7/10 = 70% |
| False alarms among labelled benign examples | 1/7 |

These percentages describe only these hand-built examples; **do not use them as product accuracy or claim a low mainnet false-positive rate**. Matching expected behavior includes expected misses. It does not mean all attacks were detected.

### What failed to detect synthetic attacks

- Incoming amount above the dust threshold.
- Incoming lookalike more than 48 hours after the reference payment.
- Missing historical block time, making the contextual timing test unresolved.

All three still produce resemblance-only warnings, but count as misses for the specific suspected-poisoning classifier. One deliberately benign transaction sequence is observably identical to the attack pattern and is flagged: the heuristic cannot infer intent from those events alone.

### Other exercised behavior

SOL/USDC patterns, reversed delivery order, duplicates, repeated dust, previous mistaken payment, partial/unavailable/empty history, symbol-versus-mint, exact-payee refunds, unrelated dust, pre-contact and pre-history cutoffs, unresolved ownership, cross-cluster recipient matching. Cutoff tests exclude later events; current-check tests are not retrospective prevention claims.

## Frozen source SHA-256

```text
pattern.ts    5115692b450ee5ebbfacb519b2c9a88bbede7752eb740b83eb7e3646f3878f3c
evidence.ts   105338a7875ceada23f15e84a3bc85714d56af5ee6e616327ed67b932703f9a5
similarity.ts d6bb0d6474bff6b7bb66b650d8102c43008e8a70a83b919ab25965a9e0cab68a
order.ts      78efb404080574b0634ccfc546e21b4e700ece25d27b65f43bfd00a6d3eb5322
continuity.ts 86a457d75bc555a697874fa0baa1ad3e1f9852f44a9c64d01155e20626be68aa
```

## Remaining evidence

Independent historical attack/benign cases with original transaction references, more address families, actual mainnet USDC coverage, verified Solami latency/recovery and final release evaluation remain open. G7 is partial, not passed. If these cases drive tuning, treat them as development cases and disclose that reuse.
