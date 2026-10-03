# M0 — Foundations and evidence

Target: 2–3 Oct. Read all documents listed in AI_AGENT_INSTRUCTIONS section 1. Cost: $0. User interviews and sponsor signup are not prerequisites.

## Build

1. Scaffold the ARCHITECTURE workspaces, verified maintained dependencies, TypeScript and test tooling. Add env template and exclusions for keys/captures/local DBs.
2. Define schemas for recipient revisions, drafts, normalized transfers, evidence, independent result dimensions and coverage.
3. Implement address validation, exact continuity and case-sensitive non-overlapping prefix/suffix comparison.
4. Create the EVALUATION manifest, published 4+1 address regression and synthetic development cases. Establish separate holdout cases before tuning. Do not invent historical signatures.
5. Implement provisional candidate classification and result-policy skeleton using explicit rule version/config.
6. Set up the approved visual tokens and placeholder navigation. Existing SVG assets remain the brand assets.

## Verify

- Published pair returns prefix 4/suffix 1 and becomes a resemblance candidate.
- Invalid byte-length/base58, identical addresses, case differences, asymmetric matches and exact-recipient mismatch cases tested.
- No automatic maliciousness from similarity; empty evidence not treated as verified safety.
- Compile/lint/test commands succeed and fixture provenance is readable.

Record G0 with actual output. Historical transaction reconstruction can remain explicitly unresolved while the address-pair regression passes. Do not activate the short Pro trial just to scaffold. Report and await M1 approval.
