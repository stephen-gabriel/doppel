# M4 — Evaluation, free operation and release

Target: 9–10 Oct. Depends on core integration; planned sponsor readiness also needs G6. Cost: $0.

## Build and evaluate

1. Freeze the detector rule version, evaluate holdout per EVALUATION and publish actual counts, misses, false alarms, unknowns and limits. Do not relabel tuned cases as independent holdout.
2. Finish historical reconstruction only where evidence is obtainable; distinguish it from the known address-pair regression.
3. Run builder-only usability walkthroughs. Fix observed issues; external feedback is optional and must not be invented.
4. Complete Method page, SDK example, README, license, setup/env documentation and operational notes.
5. Verify suitable no-charge hosting/store terms and deploy. No paid domain or required cloud DB for core Check.
6. Switch deliberately to free RPC limits and unavailable-stream mode to test trial expiry. Confirm queueing, caps and honest partial results.
7. Verify clean own-key setup, credential failure, API rate handling, mobile/keyboard/reduced-motion and source labels.

## Acceptance

- G7: measured reproducible evaluation with separate synthetic/historical results and chronological cutoffs.
- G8: core deployed Check works within tested free limits; recipient data remains local; stream outage does not falsely appear live.
- Final transaction/draft checks remain covered after UI changes.
- No secrets, committed devnet keys or unsupported accuracy/traction claims.
- CSV review is optional only after mandatory work; no new feature may displace release verification.

Record G7/G8 with actual evidence and remaining sponsor-availability concerns. Report and await M5 approval.
