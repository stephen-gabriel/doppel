# Functional requirements: Doppel

Version 3. Product scope: [PRD.md](PRD.md). Implementation: [ARCHITECTURE.md](ARCHITECTURE.md). Evaluation: [EVALUATION.md](EVALUATION.md).

## 1. Core workflows

### A. Save a recipient

Enter a label and full Solana address, review it against an independently obtained source, and explicitly confirm. Store cluster, address, label, confirmation method/time and a revision locally. Source descriptions are user assertions, not identity verification. Imported/history-derived records begin unconfirmed.

Editing an address requires reviewing old versus new full addresses and confirming a new revision. Never update from a suspicious match automatically. Export/import uses schema validation and a preview; labels are not sent to the server for checks.

### B. Check a proposed payment

Enter the sender and destination; optionally select a saved recipient, asset and amount. Check exact continuity locally and obtain bounded chain evidence through the API. A user can compare destinations without saving a recipient, but no continuity claim is possible in that mode.

Show separate continuity, pattern and coverage results, an evidence timeline, the Twin Panel, supported scope and next action. Missing network data cannot erase a locally detected mismatch.

### C. Integrate before signing

The reference app selects a recipient and prepares a direct SOL or canonical USDC transfer. In mainnet mode this is read-only preparation. In devnet mode it can reach the connected wallet only after the integration policy permits it and the final transaction matches the checked draft.

For devnet SPL execution, use a verified issuer devnet mint or an explicitly labelled six-decimal test token as specified in ARCHITECTURE. Never imply that a harness-created token is mainnet USDC.

Never silently replace a destination. Resolving a mismatch means independently rechecking the intended recipient or explicitly revising its record, followed by a fresh check. There is no bypass button for a mismatch or suspected poisoning in the reference flow.

### D. Monitor a small watch set

An operator configures 1–5 wallets, not an unrestricted public registration endpoint. Backfill supported history; subscribe using Solami; process new supported transfers; show findings and stream health. Read-only Check users do not automatically become monitored wallets.

## 2. Result contract

These dimensions are independent; a single green/red score must not replace them.

| Dimension | Values | Meaning |
|---|---|---|
| `continuity` | `exact`, `mismatch`, `unconfirmed`, `not_selected` | Relationship to the selected saved record |
| `pattern` | `suspected_poisoning`, `resemblance_only`, `none_observed`, `unknown` | What the evaluated chain evidence supports |
| `coverage` | `complete_within_scope`, `partial`, `unavailable` | Completeness only within declared assets, time range and limits |
| `action` | `pause`, `review`, `ready_for_confirmation` | Reference-app policy, not a safety guarantee |

Also return `previouslyPaid` and `incomingOnly` as facts with supporting event references, not trust levels. `unknown` is not `none_observed`.

### Reference-app policy (deterministic, ordered; revision 0.2)

1. Invalid or unsupported draft: reject validation; no signing path.
2. Saved-recipient mismatch or suspected poisoning: `pause`, irrespective of coverage or prior payments.
3. Unconfirmed/no recipient, resemblance-only, unavailable coverage, stale result or unresolved supported transfer: `review`; signing unavailable until resolved and rechecked.
4. Exact confirmed record + partial historical coverage + no suspected/resemblance finding + no unresolved supported transfer: `review` with `policy.history_acknowledgment_required`. The user may explicitly acknowledge that historical activity is missing. Only then return `ready_for_confirmation`, preserving `coverage=partial` and any `pattern=unknown` value. This is recipient-continuity confirmation, not a completed poisoning analysis.
5. Exact confirmed record + complete coverage within declared scope + no observed pattern: `ready_for_confirmation`. In both permitted paths require final review of full destination, asset and amount. Unknown actual payment destination/mint/ownership is never overridable.

Acknowledgment binds to one completed fresh check and recipient revision. It clears on edits (even if later reverted), recipient change, cancellation, recheck or expiry. It cannot override unavailable history, unresolved evidence, resemblance or suspected poisoning. Coverage and pattern facts must not be rewritten to justify continuation. Detection rule version remains 0.1; this is a separate reference-policy revision.

This deliberately conservative reference policy can be separately configured by integrators, but they must document overrides. No general-purpose fraud probability or “safe address” claim is returned.

### Evidence/coverage envelope

Include wallet, cluster, rule version, checked-at time, requested/observed time bounds, last evaluated slot, requested/fetched transaction counts, token-account discovery status, unsupported/unresolved event counts, pagination/limit reason, cache age, provider and warnings. Describe missing history rather than silently treating it as empty.

Use independent fields for `cluster` (`mainnet-beta`, `devnet`, local test), `origin` (`chain`, `synthetic`) and `mode` (`live`, `historical`, `replay`). Provider is a separate field. A historical mainnet transaction fetched now is historical chain evidence, not a newly detected live attack.

## 3. Detection specification

### 3.1 Input facts

- Successful decoded direct transfers in supported programs, including inner instructions where supported.
- Full wallet addresses, mint identity, raw integer amounts, decimals, signature, slot, instruction path, block time when available and observation time.
- Direction: outgoing payment, incoming-only contact, self-transfer or unresolved. Distinguish SOL transfer from fees/rent/balance changes.
- Explicit saved-recipient records and confirmation revisions supplied separately from network history.
- Earliest observed contact is not lifetime first contact unless history coverage supports that claim.

### 3.2 Similarity

Validate that base58 decodes to 32 bytes; compare case-sensitively. Do not reject legitimate PDAs just because they are off-curve. Identical addresses are exact matches, never lookalikes. Compute non-overlapping prefix `p` and suffix `s`; preserve full addresses for evaluation.

**Provisional candidate rule v0.1:** different valid addresses with `(p >= 2 && s >= 2)` OR `(p + s >= 5 && p >= 1 && s >= 1)`. This admits asymmetric 4+1 and 1+4 examples. It is a review candidate rule, not a calibrated probability or automatic accusation. Pure prefix-only/suffix-only observations may be shown as informational but do not trigger the v0.1 poisoning classifier by themselves.

Full-address continuity catches all saved-recipient changes independently of that rule. Tests must include other asymmetric pairs and benign resemblance, not only the published 4+1 pair. Freeze/tune rules using EVALUATION; version all threshold changes.

A future configurable display-truncation analysis can explain a UI's risk, but do not assert two addresses render identically without knowing that UI's actual display policy. Do not quote `58^n` as an exact Solana collision probability: leading-character distributions, address lengths and large-scale comparisons matter.

### 3.3 Contextual pattern

For an initial `suspected_poisoning` rule, require all of:

1. A supported successful outgoing transfer from X to A before the suspicious contact, or a previously confirmed recipient A predating that contact.
2. A later supported incoming transfer from a different B to X.
3. A/B satisfy the candidate similarity rule.
4. B is first observed as incoming-only within the evaluated prior history; qualify this statement by coverage.
5. The incoming amount is below the configured dust threshold and the contact is within the configured window after the reference payment/confirmation.

Provisional replay defaults: maximum dust 5,000 lamports for SOL and 10,000 raw units for 6-decimal USDC (0.01 USDC); maximum contextual gap 48 hours. These are engineering starting points, not research conclusions. Tune on development fixtures and publish limitations; larger, delayed, long-campaign and unsupported-token attacks can be missed. A similar address outside these conditions remains `resemblance_only`/review where observed.

Multiple independent dust senders are contextual information only, not proof of a shared campaign. A later outgoing payment to B must not erase an earlier suspicious sequence. Current checks may explain older observed sequences; historical prevention evaluations must exclude all events after their decision cutoff.

No wallet-age claim from a truncated first-seen window. No inference of losses, attacker identity, successful theft or “funds saved” from a suspicious transfer alone.

### 3.4 Monitor handling

Backfill the watch set before marking ready. Reconcile events arriving during backfill. Use event IDs including cluster, signature and instruction path: one transaction can contain several transfers. Handle duplicates, ordering, reconnects and finality according to the documented provider contract. Incompletely ordered or unresolved evidence cannot be elevated to a confirmed sequence.

Use bounded history and indexes. For five wallets a bounded pair comparison is acceptable; do not retain the old `(first2,last2)`-only index that excludes asymmetric candidates. Narrow the wallet set when capacity is exceeded rather than randomly dropping relationship events. Any actual gap is recorded in coverage.

## 4. Functional requirements

P0 = core; P0-S = planned sponsor entry; P1/P2 = optional.

| ID | Priority | Requirement and acceptance |
|---|---|---|
| FR-01 | P0 | Pure engine: validation, exact continuity, non-overlapping similarity, evidence extraction and policy; deterministic tests include published 4+1 pair and adversarial cases |
| FR-02 | P0 | Local recipient store: add, review, confirm, revise, remove, export/import; versioned schema; inbound/history import never auto-confirms |
| FR-03 | P0 | ChainReader: bounded/paginated SOL and canonical USDC history; owner/token-account discovery; failed/unsupported transactions handled; coverage envelope always present |
| FR-04 | P0 | Check API/UI: validated inputs, fixed configured provider hosts, cancellation/timeouts, cache/queue, explicit unknown states and local mismatch retained on RPC failure |
| FR-05 | P0 | Evidence view: full comparison in private result, direction, amount, ordering, event references and coverage; unsupported claims omitted |
| FR-06 | P0 | SDK and React widget: shared schema/rule version; draft fingerprint, cancellation and expiry; runnable integration example |
| FR-07 | P0 | Reference flow: mainnet analysis only; devnet-only signing and explicit verified-RPC broadcast; strict mismatch/transaction checks; partial-history continuation only under policy revision 0.2 |
| FR-08 | P0 | Devnet harness: actual endpoint cluster verification, disposable keys, capped transfers, faucet/local fallback; cannot send to arbitrary endpoint/cluster |
| FR-09 | P0 | Evaluation manifest and report per EVALUATION; provenance, cutoffs, limits, false alarms, misses and abstentions |
| FR-10 | P0-S | Solami history adapter used for real counterparties/evidence, not a status-only call; verify Data API coverage before claiming it |
| FR-11 | P0-S | One Solami stream adapter (Yellowstone or Mirage), server-side watch filters, decoded normalization and measured reconnect behavior |
| FR-12 | P0-S | Local monitor: 1–5 wallets, prefill, persistent checkpoint, bounded SQLite/captures, duplicate handling and gap visibility |
| FR-13 | P0-S | Monitor view: findings, processed supported events, last slot, coverage/backfill state, reconnect count, heartbeat and observation delay |
| FR-14 | P0 | Release: own-key clean setup, deployed free Check, explicit trial expiry/fallback behavior, mobile/accessibility and failure-path QA |
| FR-15 | P1 | CSV payout review: locally parse bounded file, match explicit recipient IDs, report missing/changed/duplicate entries, never auto-correct or send |
| FR-16 | P2 | Opt-in notifications or external integration; only after P0 and P0-S work |

## 5. API and client surface

| Surface | Purpose |
|---|---|
| `POST /api/check` | Public wallet/destination/asset context in; chain-pattern evidence and coverage out; no recipient labels persisted |
| Client `evaluateContinuity` | Compare draft against locally saved recipient/version |
| SDK `checkDraft` | Combine continuity and API evidence, bind to canonical draft and policy |
| `GET /api/status` | Provider capability, limits, health; no keys or endpoint credentials |
| `GET /api/monitor` | Read cached operator-configured public demo metrics/findings |
| `POST /api/internal/monitor` | Authenticated bounded worker snapshot ingest if hosted monitor enabled |

Use strict schemas, integer amount strings, request/body limits, IP/request throttling and typed error responses. No arbitrary RPC URL in public inputs. Multi-instance rate limiting must have a shared free backing store or be accurately described as best-effort; provider-side ceilings/queues still required.

## 6. Non-functional acceptance

- Cached results should feel immediate; measure actual warm/cold p50/p95 with provider/tier and sample counts. Warm target under 2 seconds, not a promise. No unsupported five-second guarantee for a cold 100-transaction scan on Free.
- Show progress, bounded initial scan, cancellation and partial/unknown results when time/transaction limits are reached. Background/deeper scans cannot overwrite a changed draft.
- Mainnet Check cannot invoke a signing API. Devnet flow validates supported program/mint/network and all actual transfer fields before wallet request.
- Secrets server/worker side; env files excluded; no private-key imports. Local labels/notes stay local.
- 390px mobile and keyboard flow; status uses words/icons, not only colors; reduced motion.
- Core results operate without a cloud DB. A disconnected worker makes only Monitor stale/offline, not the recipient book unusable.

## 7. Edge cases

Builder-feedback UX addendum (2 Oct): the payment form accepts decimal asset units (SOL: 9 places; USDC: 6). Convert by string/BigInt arithmetic, rejecting invalid/over-precise/overflow input rather than rounding. Before a wallet request, read sender balance and estimated fee; for a new SOL receiver, query the zero-data account rent-exempt minimum and explain any insufficient transfer amount. Do not auto-increase payments or require the receiver to pre-fund. Network labels are user-facing descriptions; actual cluster identities and all signing guards remain unchanged.

New wallet; unknown recipient; empty vs unavailable history; old/closed token accounts; multiple token accounts per owner; token account supplied instead of owner; fees/rent/refunds; delegations/PDAs; versioned transactions/address lookup tables; inner transfers; failed instructions; token symbol impersonation; unsupported Token-2022 extensions; larger-than-dust attacks; long delays; repeated dust; address poisoning followed by a mistaken prior payment; cache expiry; clock skew; database unavailable; trial ended; result race; recipient edited in another tab; final transaction differs from displayed draft.

If semantics cannot be resolved, mark unsupported/partial and review. Do not guess owner attribution from net balances alone.
