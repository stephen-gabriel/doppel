# M1 — Recipient checks and evidence

Target: 3–5 Oct. Depends on G0. Cost: $0. Use local fixtures/devnet/public mainnet reads until sponsored access is ready.

## Build

1. Local recipient storage: add, review, confirm, revise, delete, export/import. Preserve revision history; imported/incoming records never auto-confirm.
2. Implement contextual evidence/pattern rules and independent continuity/pattern/coverage results from FRD.
3. Implement bounded ChainReader and normalizer for direct SOL/canonical USDC. Discover supported token accounts, merge signatures, parse supported outer/inner transfers and expose gaps.
4. Add validated Check API, tier-aware queue/cache, timeouts and cancellation. Never accept arbitrary provider URLs from users.
5. Build Check and Recipients UI, full Twin Panel, timeline, provenance, coverage and error states.
6. Add an evidence-only historical example if sourced events are available; otherwise keep the address-pair and synthetic examples honestly separated.

## Verify

- G2: local mismatch persists on API failure; confirming/revising records behaves correctly; no history poisoning creates trust.
- G3 provisional reader: real supported transfer samples when accessible, inbound-token discovery, pagination/limit state, failed transfer and unresolved-owner behavior.
- Test legitimate refund, reordered sequence, asymmetric candidate, unsupported token and no/partial history.
- Measure actual cold/warm behavior; do not optimize by silently dropping scope.
- UI copy never upgrades a bounded no-match into safety/identity verification.

Record unavailable free archival/provider capabilities as blockers/limits, not invented data. Defer sponsor-specific G3 completion to M3. No interviews required. Report and await M2 approval.
