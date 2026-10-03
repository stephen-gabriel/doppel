# Doppel build plan

**Version 3 — 2 October 2026.** Approved direction: recipient verification for repeat Solana payments, explainable poisoning detection, an embedded pre-send check, and focused Solami monitoring.

> Check that your next payment goes to the recipient you intended, not a lookalike planted in your history.

## Start here

1. Read [AI_AGENT_INSTRUCTIONS.md](AI_AGENT_INSTRUCTIONS.md), then the product and implementation documents below.
2. Execute [M0](milestones/00_foundations_and_evidence.md) first. This folder is a specification, not an implemented application.
3. Record measured outputs and unresolved blockers in [GATES_REPORT.md](GATES_REPORT.md).
4. Continue one milestone at a time with the builder's approval.

**No customer contacts are required to begin or finish.** User interviews and external pilots are optional. The target audience and business model are hypotheses; technical tests and builder walkthroughs must not be described as customer validation.

## Documents

| File | Purpose |
|---|---|
| [PRD.md](PRD.md) | Problem, audience hypothesis, positioning, scope, budget, business and judging strategy |
| [FRD.md](FRD.md) | Result semantics, detection rules, workflows, acceptance criteria |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Packages, history discovery, integration contract, storage and deployment |
| [UI_SPEC.md](UI_SPEC.md) | Visual identity, pages, components, copy, states and accessibility |
| [EVALUATION.md](EVALUATION.md) | Historical evidence, adversarial cases, holdout evaluation and claims |
| [SOURCES_AND_BOUNTY.md](SOURCES_AND_BOUNTY.md) | Research sources, sponsor requirements and access uncertainties |
| [GATES_REPORT.md](GATES_REPORT.md) | Actual gate evidence, cost ledger, decision log |
| [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md) | Deliverables, live-demo plan, submissions and judging availability |
| [AI_AGENT_INSTRUCTIONS.md](AI_AGENT_INSTRUCTIONS.md) | Coding-agent rules and milestone reporting |
| `milestones/` | Sequential executable build instructions |
| `assets/` | Existing overlapping-square logo and favicon |

## Build sequence

| Milestone | Target window, Nigeria time | Outcome |
|---|---|---|
| [M0: Foundations and evidence](milestones/00_foundations_and_evidence.md) | 2–3 Oct | Scaffold, contracts, historical address regression, evaluation manifest |
| [M1: Recipient checks](milestones/01_recipient_checks.md) | 3–5 Oct | Local recipient book, history adapters, evidence-backed Check |
| [M2: Pre-send integration](milestones/02_presend_integration.md) | 5–6 Oct | SDK/widget, reference payment flow, devnet signing-boundary tests |
| [M3: Solami monitoring](milestones/03_solami_monitoring.md) | 6–9 Oct | Sponsored mainnet integration, small watch set, reconnect recovery |
| [M4: Evaluation and release](milestones/04_evaluation_and_release.md) | 9–10 Oct | Holdout report, free-tier mode, deployment, documentation and QA |
| [M5: Demo and submission](milestones/05_demo_and_submission.md) | 10–11 Oct | Live demos, truthful submission materials and confirmation records |

Dates are planning targets, not permission to bypass gates. Reserve 12 Oct for fixes. The published event date is 12 Oct 2026; confirm the exact submission cut-off/time zone in the form. Pending confirmation, retain the conservative planning cut-off from the previous plan: 13 Oct, 07:59 Nigeria time, and submit on 11 Oct.

## Budget and sponsor access

- **Target $0. Hard total cap $2. No transaction may require more than $0.50 upfront.** Include fees, tips, transferred/funded value, and account creation; do not subtract anticipated refunds to justify spending.
- No purchases: no paid hosting, domains, RPC top-ups, database plans, model APIs, mainnet program deployment, or paid address grinding.
- Core mainnet operation is read-only. Devnet/local fixtures cover payment integration and attack scenarios.
- The user supplied a SOLAMI bounty offering **7 days of free Pro** through `https://solami.dev/signup?ref=st-earn-sep-26`: 2 unmetered gRPC streams, 1 TB Blur, 200 RPC requests/second. Verify account activation/expiry and billing behavior before starting the limited trial.
- Prepare locally before activating. Target around 6 Oct only if readiness and the actual expiration time support it. Ask about free access through judging; approval is not assumed.
- After sponsored access, retain a tested free RPC check mode. Streaming may stop; historical evidence stays labelled historical. A recording does not replace the bounty's working-live requirement.

## Product priorities

1. Exact recipient continuity, explicit provenance and honest unknown states.
2. Explainable poisoning evidence, including asymmetric address similarity.
3. A real pre-send integration inside the reference app; mainnet analysis and devnet execution.
4. Focused, observable mainnet monitoring through Solami.
5. Optional CSV review and external feedback only after the above work.

The previous global Radar, standalone stats page and budget allowance are superseded by this plan. External feedback is explicitly optional.
