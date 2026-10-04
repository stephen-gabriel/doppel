# Gates, evidence and cost ledger

Version 3 gate IDs supersede the old plan's IDs. No old implementation gate had evidence recorded. Do not mark a gate passed merely because its requirement appears in the plan.

## 1. Gates

Statuses: `not started`, `in progress`, `pass`, `fail`, `blocked`. Record dated observations, exact commands/exit status, relevant real output and evidence paths. Failed dependent gates block claims/release for those features, not independent local work.

| ID | Milestone | Gate and acceptance | Status | Evidence / decision |
|---|---|---|---|---|
| G0 | M0 | Contracts/scaffold/evidence: engine compiles; published pair is 4+1; candidate test passes; manifest separates address-pair from reconstructed incident | pass | 2 Oct 2026. `pnpm typecheck` exit 0. `pnpm test` 37/37 pass. `pnpm lint` exit 0. `pnpm --filter @doppel/web build` exit 0. Live engine compare of published spoof/real: prefix 4, suffix 1, candidate true. Manifest keeps `DEV-PAIR-PINE-4PLUS1` as address-pair and `UNRESOLVED-PINE-RECONSTRUCTION` unresolved. Historical signatures not invented. Solami trial not activated. |
| G1 | Before Pro activation / M3 | Promotional access: payment/card/overage terms checked; builder activates only when ready; actual entitlements and UTC expiry recorded; no charge | not started | User-supplied bounty advertises seven-day Pro; account not tested |
| G2 | M1 | Recipient/evidence semantics: revisions work; incoming-only never trusted; mismatch survives lookup failure; timeline/coverage tests pass | pass | 2 Oct 2026. `pnpm test` 61/61. Continuity requires matching cluster. Import/revise never auto-confirm. Incoming-only is not trusted. Local mismatch + pause survives unavailable coverage (`packages/sdk/tests/combine.test.ts`). Missing blockTime does not become suspected_poisoning. |
| G3 | M1 then M3 | History completeness: verified SOL and USDC samples, inbound token-account case, pagination/caps/partial errors; actual provider capabilities documented | in progress | Provisional public-RPC reader only. Live sample `fixtures/g3-live-sample.json`: wallet `5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc`, 8 txs, 119 parsed events, 1 unsupported, coverage partial because cap reached; cold 5995ms / warm 5426ms (second live fetch, not cache). Mock reader proves inbound canonical USDC via token-account discovery. Closed historical token accounts not recovered. Solami not used. Sponsor G3 remains for M3. |
| G4 | M2 | Integration boundary: draft changes/expiry/races/transaction mutation cannot invoke signing; mainnet analysis has no send path | pass | SOL reference flow: builder reports installed Phantom approval and blocked mismatch; devnet RPC independently confirms resulting transfer. Automated regression evidence covers expiry/races/mutation and bounded wallet fee additions. See section 17. Other wallets and live USDC execution are not claimed verified. |
| G5 | M2 | Devnet: faucet or local setup, verified devnet endpoint, valid transfer succeeds, mismatch pauses, harness rejects non-devnet | pass | Builder-funded devnet SOL walkthrough succeeded; independently read getTransaction at confirmed commitment: slot 506784948, err=null, 1,000,000 lamports transferred, fee 80,000 lamports. Evidence: `fixtures/g5-confirmed-devnet-transfer.json`. Earlier faucet failures preserved as historical attempts. |
| G6 | M3 | Focused mainnet monitor: meaningful Solami history + supported transfers, five-minute capability run and one-hour stability run; restart/dedupe/recovery or explicit gaps demonstrated | in progress | Local SQLite worker, synthetic replay, cursor resume/dedupe/retention/recovery tests and Monitor UI implemented. No Solami/live mainnet stream or five-minute/one-hour measurement yet; G1 pending. See section 18. |
| G7 | M4 | Evaluation: frozen rule version, development/holdout provenance, chronological cutoffs, measured errors/unknowns and limits published | in progress | Frozen rule 0.1 evaluated on 23 synthetic pattern scenarios + one cross-cluster continuity case. Expected behavior 24/24; labelled confusion counts TP7/FP1/TN6/FN3. Not independent holdout; reserved descriptions overlapped development. Historical reconstruction/independent data remain open. See docs/EVALUATION_REPORT.md. |
| G8 | M4 | Release: free-tier Check/failure modes, no-card host/store terms, trial-expiry behavior, clean own-key setup and UI QA verified | in progress | Keyboard/mobile/import preview/provider-error checks pass; bounded queue/cache/API inputs and instance-local throttle implemented; current provider status truthful. Deployment guide prepared, no public URL/clean-copy install/Solami-expiry validation yet. See docs/RELEASE_GUIDE.md and section 19. |
| G9 | M5 | Submission/live availability: actual forms/deadlines/videos checked, live demo rehearsed, sponsor access-through-judging plan and confirmations recorded | not started | |

G3's provisional/free reader can pass before Solami access, but its sponsor portion must be repeated against actual Solami capabilities before claiming sponsor readiness. G6 does not require a real new attack; it requires working live processing. G9 must explicitly record unresolved sponsor questions rather than assume acceptance.

## 2. Known planning evidence (not implementation passes)

- All original build-plan files reviewed; no existing gate output was present.
- Source article's published spoof/recipient strings were compared in PowerShell during planning: prefix 4, suffix 1; old 2+2/3+3/4+4 rules all false. This is a string check, not an executed detector or reconstructed theft.
- Provider public pricing endpoint observed Free 5 RPC RPS, zero WS/gRPC on 2 Oct 2026; account-specific behavior untested.
- Builder supplied bounty text advertising seven-day Pro through the referral link; signup, billing behavior and entitlements untested.
- Builder has no target-user contacts. Optional interviews are not a release gate.

## 3. Sponsor access record

| Field | Actual observation |
|---|---|
| Signup/referral | `https://solami.dev/signup?ref=st-earn-sep-26` (bounty-supplied) |
| Card/payment/overage conditions | Not checked |
| Activation trigger and time (UTC) | Not activated |
| Expiry time (UTC and Nigeria time) | Unknown |
| Effective RPC/stream limits | Not measured |
| Data API history retention and owner coverage | Not verified |
| Stream filters/replay retention | Not verified |
| Free extension through judging | Not requested/confirmed |
| Judge-owned credentials | Builder pasted Civa's reply to Mike's trial-expiry question: “We will use our key for judging.” Original Telegram URL/date not supplied. Repo must accept reviewer-provided key; not a hosted-access extension. |
| Sponsor response on live + historical demo | Not requested/confirmed |

## 4. Cost ledger

Judging availability update: personal Pro renewal is not treated as a prerequisite for sponsor reviewers running with their own key. Clean replacement-key setup remains untested until live integration. Hosted website uptime, worker hosting and our key's post-trial access are separate operational items; no deployment or access gate is marked passed by this message.

**Target $0. Hard total cap $2. Maximum upfront transaction outlay $0.50. No purchases.** Record fees, tips, funding/principal and account-creation outlay. Returned value is recorded separately and does not retroactively authorize spending beyond either limit.

| Date | Action | Estimate USD / SOL | Gross outlay USD / SOL | Returned value | Builder approval | Evidence |
|---|---|---|---|---|---|---|
| 2 Oct 2026 | M0 local scaffold, tests, typecheck, lint, Next.js build | $0 | $0 | n/a | not required | Local pnpm; no paid services |
| 2 Oct 2026 | M1 engine/UI/Check API; public-RPC read-only history sample (8 txs) | $0 | $0 | n/a | not required | `fixtures/g3-live-sample.json`; no Solami trial; no writes |
| 2 Oct 2026 | M2 SDK/Prepare/harness; failed public devnet airdrop probe (no funds sent) | $0 | $0 | n/a | not required | `fixtures/g5-devnet-faucet.json`; error Internal error; no signature |
| 2 Oct 2026 | M2 correction: Ed25519 keys, compiled tx inspect, Playwright; faucet dry | $0 | $0 | n/a | not required | Playwright 1 passed; faucet dry/limit; no SOL purchased |

Recorded gross outlay: **$0.00**. No mainnet write is required or planned.

Takeover M2 verification on 2 Oct 2026: $0 local tests/build/browser runs and one free devnet airdrop attempt, rejected with HTTP 429. No purchase, Solami activation or funded transaction.

## 5. Decision log

| Date | Decision | Reason |
|---|---|---|
| 2 Oct 2026 | Adopt recipient continuity + explainable detection + core pre-send widget | Stronger workflow than an isolated scanner |
| 2 Oct 2026 | Limit monitor to a small explicit watch set | Fits free/local operation and makes coverage inspectable |
| 2 Oct 2026 | Budget $2 total/$0.50 per transaction, target $0 | Latest builder constraint |
| 2 Oct 2026 | Mainnet read-only; actual send integration on devnet | Full demo without mandatory spending |
| 2 Oct 2026 | User interviews/pilots optional | Builder has no contacts; demand remains a hypothesis |
| 2 Oct 2026 | Bounty-specific seven-day Pro replaces ordinary trial assumption | Builder supplied promotional terms |
| 2 Oct 2026 | Complete M0 without Solami signup | Trial not required for scaffold; G1 remains not started |
| 2 Oct 2026 | Require cluster match for exact continuity | Cross-cluster same address must not be exact |
| 2 Oct 2026 | Identify USDC by cluster mint, never by symbol | Mainnet mint `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`; Circle devnet mint documented separately; other mints are test token/unsupported |
| 2 Oct 2026 | Do not substitute observedAt for missing blockTime in attack timing | Sequence uses blockTime or same-cluster slot order only when both sides have comparable chain timestamps |
| 2 Oct 2026 | Reclassify M0 executed holdout cases as development | Independent final set is `fixtures/final-evaluation-manifest.json`; not scored until M4 |
| 2 Oct 2026 | Poisoning history searches SOL + canonical USDC regardless of payment asset | USDC preparation can still observe SOL dust |
| 2 Oct 2026 | Do not treat public-RPC repeat-fetch timing as cache-hit latency | G3 warm 5426ms remains uncached second fetch |

## 6. M0 / G0 evidence

```text
GATE / DATE: G0 / 2 Oct 2026
ENVIRONMENT / PROVIDER / TIER: local Windows, Node v24.13.0, pnpm 10.18.2; no Solami account
COMMAND OR OBSERVATION:
  pnpm typecheck  -> exit 0
  pnpm test       -> 7 files, 37 tests passed
  pnpm lint       -> exit 0
  pnpm --filter @doppel/web build -> Next.js 16.3.8 compiled; routes /, /recipients, /prepare, /monitor, /method
  node compareAddresses(published spoof, published real)
ACTUAL OUTPUT / PATH:
  compareAddresses -> status=different, prefix=4, suffix=1, candidate=true, ruleVersion=0.1
  fixtures/evaluation-manifest.json
  packages/engine/tests/*.test.ts
SUPPORTED CLAIM:
  Engine compiles. Published pair is a v0.1 resemblance candidate. Manifest separates address-pair regression from unresolved reconstruction.
LIMITATIONS / MISSING EVIDENCE:
  No historical signatures fetched. No chain reader. No recipient UI beyond placeholders. Passing tests are fixture behavior, not detector accuracy or prevention.
RESULT: pass
NEXT ACTION: await approval for M1
COST: $0.00
```

## 7. M1 / G2 evidence

```text
GATE / DATE: G2 / 2 Oct 2026
ENVIRONMENT / PROVIDER / TIER: local tests; no Solami
COMMAND OR OBSERVATION: pnpm test -> 12 files, 61 passed; pnpm typecheck exit 0; pnpm lint exit 0
ACTUAL OUTPUT / PATH:
  packages/engine/tests/continuity.test.ts cluster mismatch != exact
  packages/engine/tests/recipients.test.ts revise/import stay unconfirmed
  packages/sdk/tests/combine.test.ts mismatch+pause when coverage unavailable; incoming-only not ready
  packages/engine/tests/pattern.test.ts refund from exact A is none_observed; missing blockTime is not suspected_poisoning
SUPPORTED CLAIM: Recipient semantics and local mismatch-on-lookup-failure behave as specified on these fixtures.
LIMITATIONS: Browser IndexedDB flows are implemented but not covered by a browser runner in M1.
RESULT: pass
NEXT ACTION: M2 after approval
COST: $0.00
```

## 8. M1 / G3 provisional evidence

```text
GATE / DATE: G3 provisional / 2 Oct 2026
ENVIRONMENT / PROVIDER / TIER: public mainnet RPC https://api.mainnet-beta.solana.com ; rpsLimit 2; maxTransactions 8
COMMAND OR OBSERVATION: node --experimental-strip-types packages/sources/tests/live-history.sample.ts
ACTUAL OUTPUT / PATH: fixtures/g3-live-sample.json
  status=partial; fetched=8; events=119; unsupported=1; unresolved=0
  warnings: closed token accounts not recovered; 8-transaction cap
  sample events are resolved SOL transfers with instruction-path ids
  coldMs=5995; warmMs=5426 (second live RPC pass, HistoryCache not used in this script)
  mock: packages/sources/tests/chain-reader.test.ts inbound USDC via getTokenAccountsByOwner; failed txs excluded; cap -> partial
SUPPORTED CLAIM: Bounded public-RPC reader returns coverage envelopes, SOL samples, token-account discovery warning, and cap/partial state. Inbound canonical USDC parsing is proven on mocks.
LIMITATIONS:
  Solami Data API / Pro not used (G1 not started).
  Live 8-tx window for the published victim wallet did not include a saved canonical-USDC sample in g3-live-sample.json.
  Closed historical token accounts are undiscoverable with current RPC enumeration.
  Warm timing is a second live fetch, not a cached Check API hit.
  Sponsor G3 must be repeated against Solami in M3.
RESULT: in progress (provisional public-RPC reader; sponsor portion open)
NEXT ACTION: M3 after G1
COST: $0.00
```

## 9. M2 / G4 evidence

```text
GATE / DATE: G4 / 2 Oct 2026
ENVIRONMENT / PROVIDER / TIER: local tests; no wallet extension; spy adapter
COMMAND OR OBSERVATION: pnpm test -> 17 files, 80 passed
ACTUAL OUTPUT / PATH:
  inspect.destination_mismatch blocks mutated instruction
  CheckCoordinator draft-change race binds the later fingerprint
  expiry forces review, not ready_for_confirmation
  canRequestWalletSignature(mainnet) includes mainnet_send_forbidden
  browser spy call count 0 on mismatch/mutation; 1 after valid inspected draft
SUPPORTED CLAIM: Signing request is gated by policy + decoded instruction match. Mainnet has no send path.
LIMITATIONS: Spy is an in-process wallet adapter, not Phantom/Solflare. No live signature.
RESULT: pass
NEXT ACTION: M3 after G1; G5 live send still blocked
COST: $0.00
```

## 10. M2 / G5 evidence

```text
GATE / DATE: G5 / 2 Oct 2026
ENVIRONMENT / PROVIDER / TIER: https://api.devnet.solana.com public faucet
COMMAND OR OBSERVATION: node --experimental-strip-types tools/harness/tests/faucet.sample.ts
ACTUAL OUTPUT / PATH: fixtures/g5-devnet-faucet.json
  publicKey GiE4i7HuNHYc1nfyepW5FPuKyoiq6v5NZT2MUXp8HtTT
  ok=false error="Internal error" signature=null
  local: harness rejects mainnet cluster/endpoint/wrong genesis; mismatch pauses
SUPPORTED CLAIM: Cluster/endpoint/genesis guards work locally. A valid inspected draft can invoke a wallet spy.
LIMITATIONS: Public faucet failed. No airdrop signature. No on-chain devnet transfer. G5 send evidence blocked.
RESULT: blocked
NEXT ACTION: retry faucet later or use local validator; do not spend
COST: $0.00
```

## 11. M2 correction evidence

```text
GATE / DATE: G4 in progress / G5 blocked / 2 Oct 2026
ENVIRONMENT: local Windows; Playwright Chromium; public devnet RPC; no Solami
COMMAND:
  pnpm test -> 17 files, 81 passed
  pnpm typecheck exit 0; pnpm lint exit 0; web build exit 0
  pnpm test:e2e -> 1 passed (28.4s)
  getGenesisHash https://api.devnet.solana.com -> EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG (observed)
  tryFreeFaucets -> faucet dry/limit; no signature
ACTUAL OUTPUT / PATH:
  generateDisposableKey now Keypair.generate(); secretKey 64 bytes; publicKey matches
  discarded invalid key GiE4i7HuNHYc1nfyepW5FPuKyoiq6v5NZT2MUXp8HtTT (never funded)
  inspectCompiledTransaction on SystemProgram.transfer / TOKEN_PROGRAM_ID only
  Playwright: IndexedDB persist, destination not overwritten by recipient select, mismatch disables send, delayed edit stale copy
POLICY CONFLICT:
  USDC-inclusive poisoning history uses getTokenAccountsByOwner, which is labelled partial.
  Reference policy reviews whenever coverage !== complete_within_scope.
  Honest USDC-scope checks therefore cannot reach ready_for_confirmation.
  SOL-only synthetic complete_within_scope (tokenAccountDiscovery=not_applicable) can.
  Policy was not weakened. Complete coverage was not fabricated.
LIMITATIONS:
  No live wallet extension signing. No confirmed on-chain devnet transfer.
  G4 remains in progress until a real wallet path is observed.
  G5 remains blocked until a free faucet or later retry funds a disposable key.
RESULT: G4 in progress; G5 blocked; G3 unchanged in progress
COST: $0.00
```

## 12. M2 takeover verification and policy revision

The builder authorized takeover and the previously proposed partial-history policy correction. Historical sections above describe earlier states; this section supersedes their policy-conflict and implementation summaries.

### Implemented

- Reference policy revision 0.2 allows exact confirmed recipients with partial history to proceed only after an explicit per-check acknowledgment. Pattern stays unknown where appropriate, coverage stays partial. No override for mismatches, suspected/resemblance findings, unavailable history, unresolved transfers or stale checks.
- Acknowledgment/results clear on edits (including edit/revert), recipient changes, cancellation, recheck and expiry. Context-mismatched remote evidence is rejected; cache age reduces freshness.
- Wallet connect checks actual public key. Wallet signs only; message and signatures are verified, state is revalidated after approval, and broadcasting/confirmation uses an observed devnet RPC. No custom production doppelWallet bypass remains.
- Strict actual-instruction inspection rejects account creation, compute-budget extras, unknown programs, unsupported assets, missing signer flags and invalid amounts. SPL transfers verify both source and destination account facts. Existing devnet USDC ATA execution implemented; automatic ATA creation deferred explicitly in plan.
- Real IndexedDB page tests cover persistence and cross-tab revision. Revised/unconfirmed recipient records can be reopened for confirmation. Six Playwright scenarios replace the old one-test claim.
- Bounded live devnet harness keeps disposable secrets only in memory and performs a single transfer only if funding, policy and transaction checks pass.

### Actual commands and output

```text
pnpm install --offline
  Already up to date; downloaded 0 (workspace dependency link added)
pnpm test
  Test Files 18 passed (18)
  Tests 97 passed (97)
pnpm typecheck
  All workspace typechecks Done; exit 0
pnpm lint
  eslint .; exit 0
pnpm --filter @doppel/web build
  Next.js 16.3.8; Compiled successfully; generated 10/10 pages; exit 0
pnpm test:e2e
  6 passed (42.7s)
node --experimental-strip-types tools/harness/tests/devnet-verification.sample.ts
  observed devnet genesis EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG
  faucet ok=false error=faucet_http_429
  signature=null confirmed=false costUsd=0
```

Probe timestamp and raw observation: `fixtures/g5-takeover-probe.json`. Initial browser runs exposed locator/checkbox-state issues; corrected before the final six-test pass. No failed runs are being represented as passes.

### Claim limits and follow-up

- Automated provider and RPC doubles are not an installed extension or live transfer. G4 stays in progress for manual extension validation; G5 stays blocked on devnet funding.
- SOL and existing-account USDC transaction handling is tested with generated keys/encoded token accounts. Live USDC history and sponsor G3 remain open. Full UI visual/accessibility review is still M4 work.
- Phantom's documented signTransaction is an injected legacy API, not universal Wallet Standard support. Providers without it fail explicitly. Compatibility must be checked with the builder's actual extension.
- Native bigint binding was unavailable; tests/build used the package's pure-JS fallback successfully. No paid workaround applied.
- No Solami trial started and no mainnet writes. No external users/traction claimed.

Next: builder may run the manual devnet wallet walkthrough in README when free funds are available. M3's independent local preparation can continue with approval; live Solami work still requires G1. Do not retry a rate-limited faucet in a tight loop or buy devnet SOL.

## 13. Builder-feedback usability pass — 2 Oct 2026

Builder feedback: recipient storage worked, but Check was confusing; mainnet-beta was mistaken for an unfinished-app mode, and devnet funding roles were unclear. Builder approved clearer labels, examples, ordinary amounts and distinct check/test-payment paths. This is builder feedback only, not an external pilot.

Implemented:
- Navigation and field names describe the task; NetworkSelect explains real read-only vs devnet. Check says no funds/connection/fees are needed.
- Separate illustrative matching/lookalike examples do not touch the form or make RPC requests. Empty result panels no longer compare user input with an unrelated historical sample.
- Payment page defaults to devnet, explains sender/receiver funding, and accepts decimal SOL/USDC with exact conversion. Fee/balance/new-account minimum reads provide actionable pre-signing feedback; no automatic amount changes.
- Plain-language result summaries; expandable history/source details. Address-book network names and How it works page updated. Technical gate claims unchanged.

Actual checks:
```text
pnpm test             -> 19 files, 102 tests passed
pnpm typecheck        -> all workspaces Done; exit 0
pnpm lint             -> exit 0
$env:PLAYWRIGHT_REUSE_SERVER='1'; pnpm test:e2e
                      -> 8 passed (34.3s)
pnpm --filter @doppel/web build
                      -> compiled successfully; generated 10/10 pages; exit 0
```

Browser tests reused the builder's already-running port-3000 server with a separate browser context and mocked chain/provider requests. Initial runs caught helper-text/accessible-name mismatches; corrected before final pass. The 390px Check example flow has no horizontal document overflow. Browser regression coverage includes exact decimal payload, sender-insufficient-funds message with zero signing calls, and the previous signing-boundary cases.

Limits: faucet/manual-extension G4/G5 status unchanged; no live write attempted in this UX pass. Broader visual/accessibility QA remains M4. Cost $0, cumulative $0; Solami trial unactivated.

## 14. Installed-wallet feedback and compatibility diagnostics — 2 Oct 2026

Builder reports Phantom installed/connected, mismatch test blocked as expected, exact recipient matched and funding preflight estimated 0.000005 test SOL. After wallet approval the app reported “Wallet returned a changed transaction.” No confirmed signature supplied; installed-wallet approval reached, but full G4/G5 pass not established. Prior faucet failure remains historical evidence, not the only current blocker.

Changes:
- Freeze and round-trip the prepared transaction's wire bytes before handing it to the provider. Reconstruct returned wire bytes using the app SDK before signature verification/submission; do not rely on a foreign SDK transaction object or Buffer equality implementation.
- Permit account-index ordering differences only when resolved account set/permissions, fee payer, blockhash, instruction order/programs/accounts/data are identical. Any material difference remains blocked. New error diagnostics identify blockhash, permissions and changed/new instruction programs; wallet-added fees are not silently accepted.
- Connect action is a prominent button with nearby missing-wallet/install guidance, connecting state, connected provider/address and declined/error feedback. Devnet guidance distinguishes it from Solana Testnet.

Verification:
```text
pnpm test -> 19 files, 106 passed
pnpm typecheck -> exit 0
pnpm lint -> exit 0
$env:PLAYWRIGHT_REUSE_SERVER='1'; pnpm test:e2e -> 9 passed (59.1s)
pnpm --filter @doppel/web build -> compiled successfully; generated 10/10 pages; exit 0
```

New provider tests cover wire round-trip, semantically identical key ordering, changed permissions, added compute-budget fees and blockhash mutation. New browser test checks visible missing-wallet and connection-success feedback. These do not reproduce the exact installed Phantom response; its cause remains undetermined until a fresh user test succeeds or yields specific diagnostics. No transaction sent by the agent; cost $0; trial not activated. G4 remains in progress, G5 has no confirmed transfer.

## 15. Phantom compute-budget compatibility

Builder supplied the detailed diagnostic: one prepared instruction, three returned; changed/new program `ComputeBudget111111111111111111111111111111`. This identifies wallet-added compute-budget instructions, but their actual unit/price values were not supplied. No successful transaction signature reported.

Implemented a narrowly bounded post-wallet exception for SetComputeUnitLimit and SetComputeUnitPrice only. Reject malformed/duplicate/unsupported types, account operands, excessive units/fees, and any concurrent payment/permission/payer/blockhash change. Priority cap 0.00001 test SOL; final RPC total fee cap 0.00002 test SOL; balance rechecked after wallet additions. All signatures are verified and the signed bytes are broadcast unchanged only after fresh draft validation. Fee information is displayed in Prepare. Prepared app transactions still reject extra instructions.

Regression evidence: `pnpm test` -> 19 files, 111 tests passed; `pnpm typecheck` and `pnpm lint` -> exit 0. Provider test models the exact one-to-three instruction shape with real signing keys and mocked RPC; proves valid signed bytes are submitted. Other tests reject limit-less nonzero prices, rounding over cap, total fee overflow, insufficient funds, payment changes, duplicate types, unknown types and malformed/account-bearing budget instructions. Actual installed-Phantom retry still required; G4/G5 not marked passed. Cost $0, no agent-initiated chain write, trial not activated.

Additional verification for section 15: browser suite 9 passed (42.5s); production build compiled successfully and generated 10/10 pages, exit 0.

## 16. Observed Phantom fee cap adjustment

Builder's next retry reached compute-budget validation and reported priority fee 0.000075 test SOL (75,000 lamports), exceeding the initial conservative 10,000-lamport cap. No submission occurred. Devnet-only caps revised to 100,000 lamports priority and 120,000 lamports total; UI/error text derives from the validation constants. All fee estimation, funding, signature, payment-integrity and devnet guards remain in place. These caps are bounded test-network settings, not authorization for real-money spending.

Verification: `pnpm exec vitest run apps/web/tests/browser/recipient-and-prepare.test.ts` -> 17 passed; `pnpm typecheck` -> exit 0; `pnpm lint` -> exit 0. New regression signs a transaction with a constructed 75,000-lamport priority fee, verifies the mocked 80,000-lamport total fee, and rejects insufficient sender balance. Updated boundary cases reject 100,001 priority / 120,001 total. Actual Phantom retry/confirmation remains pending; no live transfer performed by agent; $0 cost.

## 17. Successful installed-Phantom devnet SOL walkthrough

Builder reports mismatch test blocked and subsequent correct-recipient test confirmed in Doppel using Phantom. Signature: `pufgEmeHtRRw9iSZTTRhRPbqijtFPTTcVg5wL5CQXiVgfq7DnxhJjD9LxWibs2tHREypX9KUBzhWF7H9uraGHk7`.

Independent verification: read-only JSON-RPC `getTransaction` on `https://api.devnet.solana.com`, encoding jsonParsed, commitment confirmed, maxSupportedTransactionVersion 0. Actual response: slot 506784948; blockTime 1790980236; meta.err=null; fee=80000 lamports. Instructions contain two ComputeBudget calls followed by System Program transfer of 1000000 lamports from `DdtkWSr3Su5GGRsDF1AkMLdgkjMc4C1qnhCsaY9uDZes` to `7Q6rw1qXyZDTwcGHG9mban7Y1wa2wgxRGXXr7diiArqn`. Receiver balance rose from zero to 1000000 lamports; sender fell by 1080000 lamports. Observed RPC summary saved in `fixtures/g5-confirmed-devnet-transfer.json`.

G4/G5 pass for the SOL reference workflow based on builder-observed extension interaction + independent chain confirmation + automated negative-path tests. No universal wallet compatibility, live USDC send, completed poisoning evaluation, Solami integration or mainnet sending claim. This transfer uses test funds; real-money outlay remains $0. Next authorized milestone can be M3 local preparation; G1/G3/G6–G9 remain open as applicable.

## 18. M3 local preparation

Implemented persistent focused monitoring (1–5 wallets at engine boundary; bundled replay fixes a one-wallet synthetic cohort), bounded retention with explicit gaps, instruction-path event dedupe, late-arrival re-evaluation, checkpointed replay and labelled simulated recovery. Loopback read-only snapshot endpoint feeds Next `/api/monitor` and the working Monitor page. SQLite retains state across process restart; current CLI intentionally fails for unsupported live mode and never silently substitutes replay for a provider error.

Actual local runtime probe: Node v24.13.0; built-in SQLite 3.50.4. No new downloaded dependency; workspace engine link installed offline. Initial CLI attempt failed on strip-only TypeScript parameter properties; removed those and reran successfully.

Actual `pnpm --filter @doppel/worker replay --once` first run: cursor 0/7 -> 7/7; received 5, retained 4, duplicates 1, simulated reconnects 1, findings 1, state completed. Processing mean 7.89254 ms over 5 samples (local replay only, not a benchmark/network latency). Second process: resumed cursor 7/7; restarts 1; received/retained/duplicates/findings unchanged; restart gap marked recovered from the same immutable replay dataset. Full public addresses in this synthetic fixture come from the sourced pair; amounts/times/signatures are explicitly invented test events, not reconstructed incident evidence.

Verification so far: `pnpm test` -> 21 files, 123 passed. Browser suite -> 12 passed (46.0s), including Monitor offline guidance, mobile replay finding details, stale/offline retained snapshots and stale heartbeat never live. An expanded worker-test typecheck initially caught an unknown JSON value; corrected with snapshot schema validation. Final typecheck/build results appended below after verification.

Remaining: actual Solami history/stream APIs, access gate G1, real transaction normalization into monitoring, live cold-start history prefill, provider reconnect/backfill, bounded raw-chain capture, hosted snapshot storage, five-minute capability and one-hour stability runs. Replay-only recovery is not proof of these. G6 remains in progress; no sponsor-ready claim. No Solami signup, API key, mainnet write or transaction spend. Cost $0 cumulative.

Final M3-local verification: `pnpm typecheck` all workspaces Done, exit 0; `pnpm lint` exit 0; targeted worker/API rerun 11 passed; `pnpm --filter @doppel/web build` compiled successfully, generated 10/10 pages, includes dynamic `/api/monitor`, exit 0. Earlier full suite 123 passed and browser suite 12 passed remain the latest full-run results. Node's experimental SQLite notice and optional bigint pure-JS fallback are visible runtime notices, not failed checks.

## 19. M4 independent work brought forward

Builder approved evaluation/polish/release preparation while preserving the Solami trial. No detector rule tuning performed: SHA-256 frozen source hashes and results are in `docs/EVALUATION_REPORT.md`; reproducible command `pnpm evaluate`. Original reserved manifest retained. Its five descriptions lacked complete event fixtures and overlapped development tests, so no independent holdout claim is made. Executed 23 pattern scenarios plus one continuity case, all matching declared behavior. Among 17 synthetic intent-labelled cases: TP7, FP1, TN6, FN3; six unlabelled cases excluded; two unknown outputs. Expected-behavior passes include misses, not 100% attack detection.

Release fixes: removed cancelled queue entries to prevent stalled subsequent requests; enforced inter-request spacing; bounded cache to 100 entries with expiry and copy isolation; bounded Check body to 8 KB, strict schema, instance-local 10/minute throttle and 4 active-check ceiling, request abort propagation/no-store result; truthful public-provider status. Limits are best-effort per process, not distributed authentication or global provider quota.

UI fixes: explicit recipient input labels, keyboard-visible file import, preview/confirm before import, fresh imported IDs to avoid overwriting confirmed records, duplicate skipping against local addresses, error feedback, visible focus for inputs/select/summary, skip link, reduced-motion CSS and clipboard feedback. Browser-tested 390px address-book flow and import; previous Check/Monitor mobile tests remain passing.

Actual verification:
```text
pnpm evaluate -> 23/23 declared pattern behaviors + cross-cluster mismatch correct
pnpm test -> 23 files, 129 passed
pnpm typecheck -> all workspaces Done; exit 0
pnpm lint -> exit 0
$env:PLAYWRIGHT_REUSE_SERVER='1'; pnpm test:e2e -> 15 passed (58.1s)
pnpm --filter @doppel/web build -> compiled successfully; generated 10/10 pages; exit 0
```

Computed sRGB WCAG text contrast for text/muted/iris/match/review/pause against midnight/ink/raised: minimum 5.79:1; on-iris button text 7.38:1. This checks palette combinations, not every rendered accessibility condition or a formal audit.

Reviewed official Vercel Hobby documentation: free with usage limits; personal/non-commercial restriction. No account eligibility/payment-form verification and no deployment performed. `docs/RELEASE_GUIDE.md` records candidate setup, limitations and required follow-up. `docs/INTEGRATION.md` documents current SDK/API without inventing Solami support. MIT license already present. Clean-copy install, live sponsor own-key setup/expiry and public hosting remain unverified. G7/G8 stay in progress. Real spending remains $0; no trial activated.

## 20. Hosted judging fallback preparation

Builder authorized making the hosted core usable after Solami expiry. Implemented standard Solami RPC URL configuration behind ChainReader and bounded public-mainnet failover (six-second primary budget, one-minute primary retry cooldown). No trial activated or provider URL/auth format invented. Missing/invalid configuration uses public reads with visible fallback copy. Actual Solami credentials/endpoint still require G1/G3. Devnet routing remains separate.

Primary partial evidence survives failover and conflict/dual-failure states remain review-required. Primary error details/credentials are not displayed. Public RPC failure cannot become a complete clean result. The fallback tests simulate access denial, unavailable envelopes, legitimate partial coverage, cooldown/recovery, primary evidence retention and cancellation.

Monitor now supports a schema-validated historical mainnet snapshot bundled with deployment, forced to historical/stopped display with capture date. It survives worker downtime and serverless restarts because it is a deployment asset. Operator exporter refuses synthetic/replay/non-mainnet/empty input. The current bundle holds a **real public-RPC mainnet capture** (25 transactions fetched, 0 failed after 429 backoff, 216 events parsed, 17 retained, last slot 303463012, 0 findings; coverage `partial`). No synthetic data relabelled as mainnet. Hosted availability is verified at `https://doppel-tau.vercel.app/api/monitor`; a live Solami stream remains unverified.

Checks:
```text
pnpm test -> 26 files, 142 passed
pnpm typecheck -> all workspaces Done, exit 0
pnpm lint -> exit 0
$env:PLAYWRIGHT_REUSE_SERVER='1'; pnpm test:e2e -> 18 passed (1.0m)
pnpm --filter @doppel/web build -> compiled successfully, generated 10/10 pages, exit 0
```

Initial lint also scanned the standalone sample video's vendored GSAP; excluded `videos/**` from application lint (HyperFrames has its own checks). Browser tests verify visible fallback notice, historical/not-live capture labels and navigation back to usable Check. No new deployment/account/mainnet write; $0 cost. G8 stays in progress until actual hosting and provider-expiry verification. G1/G3/G6 live gates remain open.

## 21. Evidence entry template

```text
GATE / DATE:
ENVIRONMENT / PROVIDER / TIER:
COMMAND OR OBSERVATION:
ACTUAL OUTPUT / PATH:
SUPPORTED CLAIM:
LIMITATIONS / MISSING EVIDENCE:
RESULT:
NEXT ACTION:
COST:
```
