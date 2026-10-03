# Submission checklist: Doppel

Target submit date: **11 Oct 2026**, buffer 12 Oct. Official event page lists 12 Oct. Verify exact closing time/time zone and the SOLAMI listing deadline in G9; do not rely on the previous plan's conversion as independently confirmed.

## 1. Product ready

- [ ] G0–G8 evidence recorded; any unresolved limitations stated.
- [ ] Public Check works on mainnet through meaningful Solami history reads.
- [ ] Recipient provenance, mismatches, unknown history and evidence timelines work.
- [ ] SDK/widget integrated in the reference app; actual devnet signing boundary tested.
- [ ] Mainnet preparation cannot send; demo makes devnet execution explicit.
- [ ] Focused monitor processes real supported mainnet transfers, reports coverage and handles restart/gaps.
- [ ] Fixture, historical and live modes are visually distinct.
- [ ] Evaluation counts/metrics come from recorded runs; no fabricated detection or impact numbers.
- [ ] Deployed free-tier Check, provider failure and trial-expiry behavior tested.
- [ ] Mobile/accessibility checklist completed.

## 2. Repository and runnable setup

- [ ] Public GitHub repository and MIT license; secrets/devnet keys absent.
- [ ] README: install, supported runtime, exact commands, env vars, own Solami key, watch config, data scope, mainnet read-only/devnet execution.
- [ ] Explain free/sponsored modes and trial expiry without requiring purchases.
- [ ] Pin dependencies and include working example integration.
- [ ] Document source/fixture provenance and existing open-source work reused.
- [ ] Clean-clone execution verified; credentials failing must not silently switch to fixtures.
- [ ] Local worker and hosted monitor requirements documented independently.

## 3. Live-demo strategy

The SOLAMI requirement is a **2–3 minute demo running against live mainnet**. A slot counter alone or a recording of replay fixtures is insufficient. Show a real wallet's history driving an actual check, plus a working focused stream and processed supported transfers.

A new poisoning attack is not controllable. Demonstrate detection using a separately labelled historical case/replay; ask the sponsor to confirm this mixed demonstration is acceptable. Keep live operation real even if suspected findings are zero.

Do not generate poisoning traffic on mainnet to populate the feed. Core demo needs no funded mainnet transaction. A controlled ordinary self-transfer would require a separately approved scope change within the budget and is not required.

### 2–3 minute sponsor product demo

| Time | Action |
|---|---|
| 0:00–0:20 | Explain repeat-payment substitution and show the full-address pair |
| 0:20–0:55 | Run a mainnet Check through Solami; show actual evidence, source and coverage |
| 0:55–1:25 | Show selected saved recipient and a changed destination paused in Prepare; show the embedded widget |
| 1:25–1:55 | Open an explicitly historical/synthetic evaluation case and explain the asymmetric resemblance and timeline; do not imply the current live stream caught it |
| 1:55–2:25 | Show live focused monitoring, processed transfer evidence, freshness/recovery metrics and watch scope |
| 2:25–2:50 | Show SDK usage, own-key instructions, truthful measured results and limitations |

If showing a successful transfer, include a plainly labelled devnet clip without replacing the mainnet demonstration. Use the same engine/version across modes.

### Colosseum presentation

Current general FAQ asks for a 2–3 minute presentation and a product-demo video no longer than three minutes. Confirm actual form fields; do not assume the old two-minute maximum.

Presentation: problem -> history-is-attacker-writable insight -> intended first customer -> functioning integration -> measured evidence -> competitive alternatives -> sustainable-business hypothesis. If no external users, say the project is pre-traction and show engineering evidence. No mandatory deck generation unless the form requests it.

## 4. Availability during judging

**Sponsor clarification:** in a Telegram conversation pasted by the builder, Mike asked about trial expiry before judging and Civa replied **“We will use our key for judging.”** Original message URL/date not supplied. Treat judge-owned credentials as the expected runnable-repo path. This is not a commitment to keep our hosted Pro stream active. Full provenance/limits: `SOURCES_AND_BOUNTY.md`.

- [ ] Actual sponsored access expiry recorded and visible operationally.
- [ ] Test a clean own-key setup that does not depend on the builder's account or hardcoded key; judges will configure their key themselves.
- [ ] Preserve the Telegram clarification screenshot/permalink if available. An extension request for our hosted demo is optional, not a mandatory own-key judging gate.
- [ ] Hosted core Check remains usable on verified free access; slower/partial states labelled.
- [ ] Own-key live-monitor setup works for reviewers; disclose when hosted stream is offline.
- [ ] Separately verify worker hosting and our hosted key's post-trial entitlements. Free hosting does not extend provider access.
- [ ] A stopped local worker cannot retain a live badge.
- [ ] Export reviewed real-mainnet monitor evidence into `apps/web/src/data/monitor-capture.json` and redeploy before trial expiry; test a fresh-browser visit with no worker. Never fill it with synthetic/replay data.
- [ ] Verify public RPC fallback with the actual deployment and failing/expired primary credentials; controlled failure tests alone are not live provider verification.
- [ ] Recorded demos/historical examples supplement availability; they do not waive “works live.” Resolve access expectations with the sponsor if needed.

## 5. Colosseum form

- [ ] Builder registered; solo team/profile details accurate.
- [ ] Solana selected as actual ecosystem used.
- [ ] Project/repo/site/video links work logged out.
- [ ] Development timing and any pre-existing project work disclosed accurately.
- [ ] Founder motivation and experience are truthful.
- [ ] Competition includes wallet address books, Solscan and existing security providers/scorers.
- [ ] Audience, revenue and distribution assumptions labelled as hypotheses.
- [ ] User/partner/revenue counts reflect actual evidence, including zero.
- [ ] Consider Public Good positioning for open engine/fixtures only if form/rules fit.

## 6. SOLAMI form

Obtain the exact listing URL/form; the pasted bounty did not establish every field or deadline. Prepare:

- [ ] Project name/description, public repo, live site, 2–3 minute video.
- [ ] Explanation of actual Solami endpoints/products used and what they enable.
- [ ] Real pipeline metrics with sample window, supported assets and wallet count.
- [ ] Own-key README and build-quality/recovery evidence.
- [ ] Colosseum project/profile links if requested; submit Colosseum first when required.
- [ ] Project/builder X link and tweet if requested; no need to invent a new account.
- [ ] Any unresolved live-availability question explicitly addressed with sponsor.

## 7. Draft submission text (replace placeholders only with evidence)

**One-liner:** Doppel checks repeat Solana payments against saved recipients and explains suspicious lookalike activity before an integrated app requests a signature.

**Product:** A local recipient book, evidence-backed mainnet check, reusable SDK/widget and focused wallet monitor. Mainnet operation is read-only; the reference signing flow is demonstrated on devnet.

**Solami:** Doppel uses [actually implemented RPC/Data API capability] to build supported payment history and [Yellowstone or Mirage, whichever shipped] to monitor [actual wallet count]. In [measured window], it processed [N] supported transfer events with [measured recovery/coverage facts]. Historical examples are labelled separately.

**Business:** The initial audience hypothesis is small teams making recurring payments. The free engine/widget can support adoption; future paid value could include shared recipient reviews, approval workflows, maintained integrations and monitoring. [Actual feedback/traction, or “External demand validation has not yet been obtained.”]

## 8. Final checks

- [ ] Record at readable resolution with no credentials or private local labels exposed.
- [ ] No claim of an attack caught live unless actually observed and appropriately qualified.
- [ ] No unsupported “funds saved,” “safe address,” identity verification or universal coverage claim.
- [ ] Verify all links logged out; save submission confirmations and actual timestamps.
- [ ] Keep the release runnable after submitting; report any trial/access changes honestly.
