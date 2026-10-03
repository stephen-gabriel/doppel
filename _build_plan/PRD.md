# PRD: Doppel

**Version:** 3, 2 October 2026. **Builder:** solo. **State:** plan approved; implementation and account gates not yet run.

**Tagline:** Check that your next payment goes to the recipient you intended.

## 1. Executive summary

Doppel is an open-source recipient-verification layer for repeat Solana payments. It checks a proposed destination against a user-confirmed recipient record, explains suspicious lookalike interactions using transaction evidence, and plugs into a payment application's pre-send flow.

The first implementation includes a single-user local recipient book, a read-only mainnet Check, a reusable engine and widget, a reference payment-preparation app with devnet execution, and a small-wallet-set monitor powered by Solami.

**Core insight:** transaction history is writable by strangers. An unsolicited transfer must not make its sender a trusted recipient. A saved recipient, a previously paid address, and an incoming-only contact carry different evidence.

## 2. Problem and limits

Address poisoning plants a confusing destination in a wallet's activity. A sender may later copy it instead of the intended recipient. Solana's low fees support cheap unsolicited transfers.

The problem is supported by reported Solana incidents and public research. The November 2024 $2.91M case in Pine Analytics has a 4-character prefix and 1-character suffix match, which the old symmetric detector missed. The new plan explicitly covers asymmetric resemblance.

However, resemblance is not proof of malicious intent. Prior payment is not proof of identity. A clean result over a bounded history does not establish safety. Doppel checks recipient continuity and known patterns; it does not guarantee recipient identity, detect every scam, or recover funds.

See [SOURCES_AND_BOUNTY.md](SOURCES_AND_BOUNTY.md) for source limitations. Do not present multichain/Ethereum attack statistics as Solana measurements.

## 3. Audience and demand hypothesis

| Audience | Job |
|---|---|
| Initial hypothesis: small teams making recurring SOL/USDC payments | Verify that repeat contributor or grant payments use the intended recipient address |
| Individual repeat sender | Compare an exchange/own-wallet destination against an independently saved record |
| Payment-app developer | Add an evidence-backed recipient check before requesting a signature |

The builder currently has no contacts in these groups. **That does not block development, release, or submission.** Begin with a documented reference workflow and builder-run usability walkthroughs. Optional outreach may challenge the hypothesis later. Claim no users, partnerships, customer validation or revenue without actual evidence.

## 4. Product and differentiation

### 4.1 Recipient continuity

Save a full address under a local label after the user verifies it through their normal trusted source. Record confirmation provenance and revisions. Compare every proposed repeat-payment destination exactly against that record. Any changed address is a recipient mismatch, even without visual similarity.

Never create trusted contacts from unsolicited transfers or automatically replace a saved address with a detected alternative. The initial record can be wrong; confirmation means the user confirmed the record, not that Doppel verified a person.

### 4.2 Explainable poisoning evidence

Show a transaction timeline and Twin Panel: previous payment to A, later unsolicited transfer from B, proposed payment to B, and how A and B resemble each other. Include source, signatures/instruction references, timestamps, coverage and uncertainty. Display each claim only if supported.

### 4.3 Embedded pre-send check

Ship the engine, typed SDK and React widget as P0. Embed them in a working reference payment app. Changes to the wallet, cluster, recipient record, destination, asset or amount invalidate the previous check. A mismatch pauses that app before a wallet signing request.

The mainnet reference mode prepares and analyzes payments without signing. Devnet proves the signing-boundary integration. Doppel does not intercept unrelated wallet apps, act as a transaction firewall across the network, or provide protocol-level enforcement.

Reference policy revision 0.2 permits an exact confirmed recipient with partial historical coverage to continue after an explicit acknowledgment tied to that fresh check. Coverage stays partial and pattern may stay unknown. Unavailable history, unresolved supported events, resemblance, suspected poisoning and transaction uncertainty still block. This resolves the public-RPC closed-token-account limitation without claiming complete analysis. Current devnet SPL execution requires existing canonical token accounts; account creation is deferred.

### 4.4 Focused monitoring

Seed relevant history for a maximum of five configured demonstration wallets, then monitor selected SOL and canonical USDC activity through Solami Yellowstone or Mirage. Show findings and pipeline health. Monitor a known cohort rather than claiming network-wide coverage.

### 4.5 Competitive position

Blockaid and others already provide poisoning defenses; Solscan offers labels and spam filters; Pine links an MIT-licensed scorer. Open-source prefix matching is not new. Doppel's proposed advantage is the combination of recipient continuity, inspectable evidence and an easy pre-send integration for smaller payment workflows. This is a positioning hypothesis, not an established moat.

## 5. Scope

| Priority | Deliverables |
|---|---|
| P0: core product | Pure engine; provenance-aware local recipient book; Check and history coverage; SOL and canonical USDC direct-transfer support; evidence timeline; typed API/SDK/widget; reference preparation flow; guarded devnet execution; evaluation; reproducible README; free deployment |
| P0-S: required for planned sponsor entry | Meaningful Solami mainnet history reads; bounded live monitor via Yellowstone or Mirage; reconnect recovery; actual metrics; runnable own-key setup; live-mainnet demo |
| P1 | CSV payout review against saved recipient records; improved import/export ergonomics; independently obtained feedback |
| P2 | Telegram notifications; third-party payment-app integration; broader asset/program coverage |

**Out of scope:** global Radar, separate stats dashboard, custody, user accounts/shared teams, mainnet sending, mainnet smart-contract deployment, paid infrastructure, LLMs, universal transaction decoding, browser-wide interception, signed recipient identity certificates, victim leaderboards and tokens.

No consumer app asks for a private key. Devnet harness-generated disposable keys are the only test-key exception and must never hold real funds or be committed.

## 6. Budget

**Target $0; hard cap $2 total. Per-transaction upfront limit $0.50.** Count fees, tips, account creation and funded/transferred principal. Track gross outlay and any returned funds separately. No spending is needed for the defined deliverables.

| Item | Plan | Spend |
|---|---|---|
| Development, engine, SDK | Local tools and open-source dependencies | $0 |
| Recipient storage | Browser-local IndexedDB; no account or database subscription | $0 |
| Web/API | Free hosting/default subdomain; verify applicable terms and quotas | $0 |
| Mainnet history | Solami free access/sponsored Pro; documented public fallback | $0 |
| Stream | Seven-day bounty Pro; local worker | $0 |
| Worker storage | Local SQLite and bounded capture files | $0 |
| Shared demo monitor snapshots | Optional no-card free Postgres tier, verified before adoption | $0 |
| Payment tests | Devnet faucet/local fixtures | $0 |
| LLM, vanity compute, domains, RPC top-ups | Not used | $0 |

A future builder-approved mainnet transaction would require a scope change and an upfront estimate within both caps. It is not a gate or success criterion here.

## 7. Solami access and trial lifecycle

The user supplied sponsor terms advertising seven days of free Pro via `https://solami.dev/signup?ref=st-earn-sep-26`, including 2 unmetered gRPC streams, 1 TB Blur and 200 RPC requests/second. These bounty terms are distinct from ordinary public trial marketing.

Use RPC/Data API for verified history capabilities; choose one of Yellowstone or Mirage for filtered monitoring. Blur is not needed. Beam is only relevant if a future version sends on mainnet.

Before activation, verify card/payment requirements, metering/overage behavior, trigger time and exact UTC expiration. Do not add payment details, prepaid balance or auto-renewal. Ask whether free access can extend through judging; never assume approval.

The observed public pricing API on 2 Oct lists Free at 5 RPC requests/second and zero WS/gRPC connections. Recheck at implementation; do not promise trial performance on Free. Implement queueing, incremental reads and caching. If free streaming is unavailable after expiry, show polling or offline monitoring accurately. Keep mainnet Check working and own-key stream instructions reproducible.

## 8. Success criteria

- An address differing from the selected saved recipient is caught regardless of similarity.
- Incoming-only contacts are never silently trusted.
- Historical address-pair and timeline tests cover asymmetric matches without hindsight leakage.
- Findings expose inspectable evidence and explicit history limits.
- A changed or stale draft cannot reuse a prior result to reach the reference app's signing request.
- Devnet end-to-end flow proves both a blocked mismatch and an intentional valid transfer.
- Mainnet reads and live monitoring use Solami meaningfully with measured pipeline health.
- Final evaluation reports false alarms, misses and unknowns with denominators and provenance.
- Deployed Check remains usable in tested free-tier mode; degradation is visible.
- A clean-clone own-key setup and 2–3 minute sponsor demo work.

No success criterion requires a new attack during recording, an external pilot, a paid purchase or a fabricated accuracy percentage.

## 9. Judging and submission strategy

Primary entry: Colosseum Crypto World's Fair, Solana ecosystem track. Secondary: SOLAMI bounty subject to demonstrated live operation. An openly reusable engine/evaluation set may support a Public Good prize case; eligibility/selection is not assured.

| Colosseum factor | Evidence we can provide |
|---|---|
| Founder–market fit | Honest motivation, research and learning; no invented security/customer experience |
| Insight | History is attacker-writable; continuity and observed contact are distinct |
| Product and execution | Working check, integrated pause, correct evidence, mainnet pipeline and failure handling |
| Market size | A clearly described initial segment and expansion hypothesis; no unsupported TAM |
| Communication | A concrete repeat-payment story and concise explanation |
| Viability | Hosted operations/team workflow hypothesis beyond free string matching |
| Traction | Actual usage/feedback only; explicitly pre-traction if none |

The sponsor judges meaningful Solami usage, live mainnet operation, build quality, usefulness and creativity. A provider badge or get-slot call alone is insufficient.

## 10. Business hypothesis

Free engine, widget and single-user recipient checks lower adoption friction. Potential paid value later: shared recipient changes/reviews, approval workflows, reliable monitoring, integrations and support. No billing or team system in this MVP.

Initial distribution: runnable example, public technical case study and developer documentation. Optional outreach to payment builders and community operators is useful, not a dependency. If feedback indicates existing address books solve the problem, reconsider the workflow before expanding features.

## 11. Risks and responses

| Risk | Response |
|---|---|
| User initially confirms the wrong address | Store provenance; explicit change workflow; never claim identity verification |
| Heuristics miss attacks or accuse benign transfers | Separate resemblance, observed pattern and confirmed facts; label suspected; publish evaluation limits |
| SPL history incomplete | Discover token accounts or verify indexed owner-history API; surface unresolved/closed-account coverage |
| Trial expires before judging | Ask for sponsor access; test free Check; provide own-key live setup and honest stream status |
| No incident occurs in the live window | Show real live operation plus distinctly labelled historical evaluation; confirm sponsor expectations |
| Local worker is offline | Heartbeat expiry and captured/offline state; no false live feed |
| New user habit too burdensome | Embedded widget is core; interviews optional; avoid unsupported demand claims |
| Budget exhausted | Core requires no mainnet spending; reject paid dependencies and top-ups |

## 12. Milestones and dates

M0 foundations/evidence → M1 recipient checks → M2 pre-send integration → M3 Solami monitoring → M4 evaluation/release → M5 demo/submission. Instructions and target dates are in [README.md](README.md) and `milestones/`.

Submit on 11 Oct. Official event page lists 12 Oct 2026; exact cut-off and video/form fields are gate G9. Pro access must be scheduled from actual activation/expiry, not date arithmetic alone.
