# Evaluation and evidence

M4 preparation result: see `../docs/EVALUATION_REPORT.md` and run `pnpm evaluate`. The reserved five-case manifest was descriptive and overlapped development scenarios; the implemented evaluation is explicitly synthetic/non-independent. No independent holdout accuracy or historical prevention claim. G7 remains in progress pending stronger evidence.

## 1. What this evaluation can establish

Test recipient continuity, bounded-history detection, transfer normalization and integration behavior separately. A passing fixture proves behavior on that fixture, not universal attack prevention. Unit-test coverage is not detector accuracy. Builder walkthroughs are not customer validation.

No external users are required. Technical evidence, public incident research and reproducible tests are the mandatory validation route. Optional user feedback is reported separately if obtained.

## 2. Fixture manifest

Every case records: ID, purpose, source URL/date, cluster, origin, expected fact/pattern label, label confidence, full addresses, actual event references if available, requested/available history, decision cutoff, rule version, development/holdout assignment and known limitations.

Distinguish:

- **Address-pair regression:** sourced addresses, no claim to reconstruct a transaction sequence.
- **Historical chain reconstruction:** verified signatures/instructions and chronological pre-decision evidence.
- **Synthetic normalized sequence:** controlled logical scenario; not a live incident.
- **Devnet integration:** actual test transactions on devnet.
- **Unlabelled mainnet observation:** useful for parser/coverage checks, not a ground-truth benign example.

Never invent transaction signatures, timestamps or amounts to fill a historical gap. If a source has addresses only, keep the pair test and mark reconstruction unresolved.

## 3. Required published-pair regression

Source: https://pineanalytics.substack.com/p/solana-account-dusting-and-address

```text
Reported victim: 5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc
Reported spoof:  4yfuQCL4fnNfSbBgqFcPTFn5GGZABDaEFQLhGpwjizcY
Reported real:   4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY
```

Mechanical result checked during planning: prefix 4, suffix 1. The old symmetric rules excluded this pair. New engine must recognize it as a resemblance candidate, not automatically assert an attack solely from strings. “Reported real” means the source's designation, not a current verified recipient recommendation.

No programmatic end-to-end detection has yet been run. Locate original transaction evidence if freely accessible; if archival data cannot be fetched, record that limit and do not claim historical prevention.

## 4. Minimum scenario matrix

| Case | Expected behavior |
|---|---|
| Saved recipient exact match | Continuity exact; no independent identity guarantee |
| Saved recipient changed to unrelated address | Mismatch/pause, regardless of resemblance |
| Published 4+1 pair and generated 1+4 case | Candidate resemblance; contextual rule evaluated separately |
| Benign lookalike without suspicious sequence | Resemblance-only, not poisoning accusation |
| Outgoing A then lookalike inbound B within configured dust/window | Suspected pattern with evidence references |
| Incoming dust precedes reference payment | No fabricated chronological attack sequence |
| Small legitimate refund from exact A | Not a lookalike attack |
| Incoming-only sender | Never auto-confirmed/saved as trusted |
| Previously paid B after suspicious contact | Prior payment does not erase suspicious evidence |
| Missing/partial/unavailable history | Unknown or qualified findings; no complete clean verdict |
| Exact confirmed recipient + partial coverage acknowledgment | Can reach final review under policy 0.2; pattern/coverage remain unchanged; acknowledgment expires with the check |
| Unavailable/unresolved history + acknowledgment attempt | Cannot bypass review |
| Wallet returns altered transaction or draft changes during signing | No broadcast; message/signature and current draft checked again |
| Old reference outside window, large incoming amount | Published detection limitation; continuity still independent |
| Unsupported mint/extensions or unresolved owner | Coverage gap/review, no guessed attribution |
| SPL inbound without owner in transaction keys | Loader discovers supported token-account history |
| Multiple transfers under one signature | Separate instruction-path events |
| Duplicate/out-of-order/replayed stream events | Stable findings, no double counts; unresolved ordering qualified |
| Stream gap/restart/fork | Backfill/reconciliation or explicit coverage gap |
| Draft edited during request/after result | Prior response rejected, ready state invalidated |
| Recipient edited in another tab | Revision invalidates check |
| Transaction mutated after checking | Wallet request never invoked |
| Mainnet or mismatched RPC passed to harness | Refuses before any write |

Use real SDK/wallet-boundary spies and decoded instruction assertions for integration tests; a disabled button alone is insufficient.

## 5. Split and calibration

Create development fixtures and a separate holdout before final tuning; aim for at least 20 varied logical cases across the matrix, rather than 20 arbitrarily chosen wallets. Keep families/campaigns together to avoid near-duplicate leakage. The published pair is a known development regression, not independent holdout evidence.

Tune provisional thresholds on development data only. Record every rule change. Freeze rule version before final holdout. If a holdout failure leads to tuning, that case becomes development evidence; obtain a new untouched holdout or disclose the absence of independent holdout results.

Use pre-decision cutoffs for historical claims. Fetching later evidence is allowed for research, but exclude it from features used in a simulated earlier decision. Distinguish a reproduction using all history from a prevention evaluation.

## 6. Report format

- Dataset counts by origin and confidence, scope/assets and selection method.
- Confusion counts where labels are known: true/false positives and true/false negatives. Define positive as suspected-poisoning output for the pattern task, separate from continuity mismatches.
- Precision/recall only when denominators exist; unknown/unlabelled cases excluded and counted explicitly. Synthetic cases are reported separately from historical chain cases.
- Abstention/unknown/partial rate; false alarms per labelled benign decision, not per scanned transfer unless clearly defined.
- Coverage gaps, missed attack classes and small-sample limitations.
- Warm/cold latency with provider/tier/sample count; parser/stream processing delay definition; replay gaps, dedupe and recovery observations.
- Integration pass/fail results for draft binding and transaction mutation.

No universal “low false-positive rate” from an unlabelled wallet scan. No dollar-loss prevention claim. An automated finding is suspected until independently substantiated.

## 7. Usability without external testers

The builder performs a documented task walkthrough: add recipient, prepare repeat payment, encounter mismatch, inspect evidence, independently revise/check, complete devnet payment, recover from provider failure. Record confusion and fixes as builder observations.

Optional external participants may try the flow later without sharing keys or sending real funds. Report participant count and actual comments honestly. Zero participants is acceptable and must remain zero in submission materials.
