# AI agent instructions: Doppel

## 1. Read before implementing

Read this file, [PRD.md](PRD.md), [FRD.md](FRD.md), [ARCHITECTURE.md](ARCHITECTURE.md), [UI_SPEC.md](UI_SPEC.md), [EVALUATION.md](EVALUATION.md), [SOURCES_AND_BOUNTY.md](SOURCES_AND_BOUNTY.md), [GATES_REPORT.md](GATES_REPORT.md), and the active milestone file. Version 3 replaces the earlier checker/global-Radar plan.

The current work is a solo, near-zero-budget MVP. User contacts, interviews and pilots are **optional**. Missing contacts must never block scaffolding, engineering gates or submission. Describe target users/business as hypotheses until evidence exists.

## 2. Non-negotiable implementation rules

1. **Target $0; cap $2 total and $0.50 upfront per transaction.** No purchases, paid service plans, prepaid RPC, model APIs, domains, compute rental or mainnet deployments. An actually billable action requires the builder's explicit approval and an estimate including all upfront value. Free open-source libraries do not require approval merely because their maintainers sell unrelated products.
2. **Mainnet is read-only.** The app, worker and harness do not sign/send on mainnet. The reference app can request a signature only on verified devnet. No automatic sending loops.
3. **No user secrets.** Never request seed phrases/private keys. Wallet signing stays in the user's wallet. Disposable devnet harness keys may be generated locally; exclude them from source control, logs and deployment.
4. **Verify APIs.** Read current provider/client documentation. Never invent Solami Data API endpoints, filters, replay semantics, pricing or package names. The bounty is an entitlement claim, not a completed access test.
5. **Correct evidence semantics.** Saved recipient, previous payment and incoming-only contact are distinct. Similarity is not maliciousness. A bounded no-match is not safe. Never auto-correct a destination or auto-trust an incoming sender.
6. **Result binding.** Bind checks to draft fields and recipient revision; invalidate on change/expiry. Validate the final supported devnet transaction before the wallet request. Protection applies only inside integrated apps.
7. **Truthful data.** Keep cluster, origin and observation mode separate. Label fixture/replay/historical/mainnet/devnet correctly, including when RPC fetches an old transaction live. Zero detections is valid.
8. **Honest evaluation.** No invented accuracy, saved funds, victims, users, partners or test passes. Historical prevention tests use only pre-decision data. Unknown-labelled activity is not ground truth.
9. **Pure core.** Detection and policy are deterministic functions with explicit clocks/config; network, storage and wallet APIs live in adapters.
10. **Bounded operation.** Watch at most five configured demo wallets by default. Backfill before declaring a monitor ready. Do not randomly sample paired events and claim full coverage.
11. **Cost-free failure modes.** Timeouts, partial history, quota exhaustion and trial expiry are visible. Never silently switch to a billable path.
12. **Respect the approved UI.** Reuse the existing logo, palette and Twin Panel; implement the revised copy and workflow, not the obsolete safety verdicts/global Radar.

## 3. Execution protocol

- Work one milestone at a time; stop with a report before the next unless the builder explicitly authorizes multiple milestones.
- Start by naming the milestone, relevant gates, planned work and cost ($0 unless approved otherwise).
- Use actionable todos for non-trivial work. Do not spawn subagents unless explicitly authorized by the user or applicable higher-priority instructions.
- Do not commit/push/create a PR unless explicitly requested. Preserve user work.
- Gates block their dependent features, not unrelated local work. For example, unavailable Pro access does not block engine work.
- Run meaningful tests for the milestone. Do not equate line coverage with detector accuracy.
- Record actual command output and dated observations in GATES_REPORT; distinguish assertions, external reports and measured results.
- If a dependency cannot be verified, describe the blocker and use the documented free fallback where allowed. A sponsor-mode failure must remain visible and must not be called sponsor-ready.

## 4. Milestone prompts

Each prompt below includes the current specification set through section 1.

| Milestone | Prompt |
|---|---|
| M0 | Read the build plan and execute `milestones/00_foundations_and_evidence.md` only. Establish contracts, scaffold, fixture provenance and the asymmetric-match regression. Report evidence and blockers. |
| M1 | Execute `milestones/01_recipient_checks.md` only. Build the local recipient workflow and evidence-backed Check with honest coverage and source labels. |
| M2 | Execute `milestones/02_presend_integration.md` only. Build the SDK/widget and reference payment flow; verify draft binding and devnet-only wallet execution. |
| M3 | Execute `milestones/03_solami_monitoring.md` only. After access gate G1, wire real Solami mainnet history and focused monitoring. Measure and test reconnect recovery. |
| M4 | Execute `milestones/04_evaluation_and_release.md` only. Freeze rules, evaluate holdout, test free-tier mode, deploy, finish docs and accessibility. |
| M5 | Execute `milestones/05_demo_and_submission.md` only. Rehearse live operation, prepare truthful demo/submission material and help the builder verify submissions. |

## 5. End-of-milestone report

```text
MILESTONE:
DONE:
NOT DONE / BLOCKED:
FILES CHANGED:
HOW TO RUN:
TEST OUTPUT: actual commands, exit status and relevant output
GATE EVIDENCE: measured observations and links to recorded evidence
CLAIM LIMITS: supported assets/history, data origin, known gaps
COST: spent this milestone; cumulative gross outlay; possible next-step costs
QUESTIONS FOR BUILDER: only decisions needed for dependent work
NEXT: proposed next milestone, awaiting approval
```

## 6. Context refresh

```text
Reread _build_plan/AI_AGENT_INSTRUCTIONS.md and GATES_REPORT.md.
Confirm the active milestone, $2 total/$0.50 transaction limits, read-only mainnet,
optional customer feedback, evidence/coverage semantics, and current blockers.
Continue only the authorized milestone.
```
