# M2 — SDK, widget and pre-send boundary

Target: 5–6 Oct. Depends on G2 and sufficiently working history/evidence for integration tests. Cost: $0.

## Build

1. SDK coordinator: canonical draft fingerprint, recipient revision, cancellable check, result freshness and rule version.
2. React widget and runnable integration example using the shared engine/result schema.
3. Prepare page with exact recipient selection, destination, asset, amount, sender and prominent cluster mode.
4. Mainnet ends at preparation/analysis. Devnet-only execution validates network/endpoint and final transaction fields/instructions before wallet request.
5. Harness generates disposable devnet keys, uses faucet or local fixtures, caps operations and refuses non-devnet. Do not grind expensive vanity addresses; exact mismatch needs no lookalike key, and pattern logic can use labelled fixtures.
6. Handle edits, async races, result expiry and cross-tab recipient revision changes.

## Verify

- G4: signing provider is never called for mismatches, unsupported/unavailable/unresolved states, stale checks, changed drafts or mutated transactions. Partial history requires the explicit per-check acknowledgment defined in FRD policy revision 0.2.
- A final instruction destination/mint/amount change is caught even if the visible input did not change.
- Mainnet mode exposes no send path. Changing a cluster string is not enough to bypass the actual endpoint check.
- G5: real devnet valid transfer plus paused mismatch; printed transaction references and outputs. If faucet is unavailable, local tests continue but actual devnet evidence remains blocked.
- Confirm raw integer handling, canonical mint checks and existing token-account ownership. Current scope rejects ATA/account creation and compute-budget extras instead of allowing unvalidated parameters.

Record G4/G5. No mainnet funding or external testers required. Prepare sponsor signup questions and local readiness before the limited Pro window. Report and await M3 approval.
