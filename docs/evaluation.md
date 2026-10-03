# Evaluation notes

See `fixtures/evaluation-manifest.json` and `fixtures/final-evaluation-manifest.json`.

## Policy

- Development cases may be executed in unit tests and used to implement v0.1.
- Cases previously labelled holdout (`HOLD-CONT-UNRELATED-MISMATCH`, `HOLD-PAT-OUTSIDE-WINDOW`) were executed during M0 development tests. They were reclassified to development on 2 Oct 2026 and are not independent holdout evidence.
- `fixtures/final-evaluation-manifest.json` is the reserved final set. Do not assert their expected outcomes until M4 after the rule version is frozen.
- Passing unit tests prove fixture behavior, not detector accuracy or historical prevention.

## Provenance

- `DEV-PAIR-PINE-4PLUS1` is an address-pair regression from published strings. It is not a reconstructed incident.
- `UNRESOLVED-PINE-RECONSTRUCTION` remains unresolved. No signatures, timestamps, or amounts were invented.
